#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::blocking::Client;
use serde::Serialize;
use serde_json::{json, Value};
use std::io::Write;
use std::{
    fs::OpenOptions,
    net::TcpListener,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Mutex, atomic::{AtomicBool, Ordering}},
    time::Duration,
};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter, Manager,
};
use tauri_plugin_dialog::DialogExt;
mod release_check;

#[derive(Clone, Serialize)]
struct Connection {
    url: String,
    token: String,
    #[serde(rename = "outputRoot")]
    output_root: String,
}
struct Engine {
    connection: Connection,
    local_token: String,
    child: Mutex<Child>,
    client: Client,
}
impl Engine {
    fn stop(&self) {
        let _ = self
            .client
            .post(format!("{}/api/shutdown", self.connection.url))
            .bearer_auth(&self.connection.token)
            .header("X-Pheno-Ranker-Local", &self.local_token)
            .send();
        if let Ok(mut child) = self.child.lock() {
            for _ in 0..20 {
                if child.try_wait().ok().flatten().is_some() {
                    return;
                }
                std::thread::sleep(Duration::from_millis(50));
            }
            let _ = child.kill();
            let _ = child.wait();
        }
    }
    fn json(&self, response: reqwest::blocking::Response) -> Result<Value, String> {
        let ok = response.status().is_success();
        let body: Value = response.json().map_err(|e| e.to_string())?;
        if !ok {
            return Err(body["error"]["message"]
                .as_str()
                .unwrap_or("The engine request failed")
                .to_string());
        }
        Ok(body["data"].clone())
    }
}
impl Drop for Engine {
    fn drop(&mut self) {
        self.stop()
    }
}

fn start_engine(app: &tauri::App) -> Result<Engine, Box<dyn std::error::Error>> {
    let smoke_engine = std::env::var_os("PHENO_RANKER_DESKTOP_ENGINE").map(PathBuf::from);
    let uses_smoke_engine = smoke_engine.is_some();
    let root = if let Some(engine) = smoke_engine {
        engine.canonicalize()?
    } else if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..").canonicalize()?
    } else { app.path().resource_dir()?.join("engine") };
    let perl = if cfg!(debug_assertions) && !uses_smoke_engine {
        PathBuf::from("perl")
    }
        else { root.join(if cfg!(windows) { "runtime/bin/perl.exe" } else { "runtime/bin/perl" }) };
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let url = format!("http://127.0.0.1:{}", listener.local_addr()?.port());
    let token = uuid::Uuid::new_v4().simple().to_string();
    let local_token = uuid::Uuid::new_v4().simple().to_string();
    let app_data = app.path().app_local_data_dir()?;
    let state = app_data.join("runs");
    std::fs::create_dir_all(&state)?;
    let log_path = app_data.join("engine.log");
    let log = OpenOptions::new().create(true).truncate(true).write(true).open(&log_path)?;
    let error_log = log.try_clone()?;
    drop(listener);
    let mut command = Command::new(perl);
    command.arg(root.join("app/engine/main.pl")).args(["daemon", "-l", &url])
        .current_dir(&root)
        .env("PHENO_RANKER_ROOT", &root)
        .env("PHENO_RANKER_SHARE_DIR", root.join("share"))
        .env("PHENO_RANKER_API_TOKEN", &token)
        .env("PHENO_RANKER_LOCAL_TOKEN", &local_token)
        .env("PHENO_RANKER_STATE_DIR", &state)
        .env("PHENO_RANKER_API_HOSTS", "127.0.0.1")
        .env("PHENO_RANKER_API_ORIGINS", if cfg!(debug_assertions) {
            "tauri://localhost,http://tauri.localhost,https://tauri.localhost,http://127.0.0.1:1420"
        } else {
            "tauri://localhost,http://tauri.localhost,https://tauri.localhost"
        })
        .env("MOJO_LOG_LEVEL", "warn")
        .env("PHENO_RANKER_JOB_LIMIT", std::thread::available_parallelism().map(|n| n.get().min(16)).unwrap_or(1).to_string())
        .stdin(Stdio::null()).stdout(Stdio::from(log)).stderr(Stdio::from(error_log));
    if !cfg!(debug_assertions) {
        // A release must contain its warmed Inline cache and frozen Python helper.
        let cache = root.join("inline");
        if !cache.is_dir() { return Err("Packaged Inline cache is missing".into()); }
        command.env("PHENO_RANKER_INLINE_DIR", cache);
        command.env("PHENO_RANKER_PYTHON_HELPER", root.join(if cfg!(windows) {
            "python/pheno-ranker-helper.exe"
        } else { "python/pheno-ranker-helper" }));
    }
    #[cfg(windows)] {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let engine = Engine {
        connection: Connection { url, token, output_root: state.to_string_lossy().into_owned() },
        local_token, child: Mutex::new(command.spawn()?),
        client: Client::builder().no_proxy().timeout(Duration::from_secs(5)).build()?,
    };
    for _ in 0..100 {
        if engine.client.get(format!("{}/api/health", engine.connection.url))
            .bearer_auth(&engine.connection.token).send().is_ok_and(|r| r.status().is_success()) { return Ok(engine); }
        if let Some(status) = engine.child.lock().unwrap().try_wait()? {
            return Err(format!("Local engine exited ({status}): {}", std::fs::read_to_string(&log_path).unwrap_or_default()).into());
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    Err("The ranking engine did not become ready".into())
}

#[tauri::command]
fn connection(engine: tauri::State<Engine>) -> Connection {
    engine.connection.clone()
}

#[tauri::command]
async fn select_paths(
    app: tauri::AppHandle,
    directory: bool,
    multiple: bool,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let dialog = app.dialog().file();
        let paths = if directory {
            dialog.blocking_pick_folder().map(|p| vec![p])
        } else if multiple {
            dialog.blocking_pick_files()
        } else {
            dialog.blocking_pick_file().map(|p| vec![p])
        };
        let Some(paths) = paths else {
            return Ok(json!([]));
        };
        let paths: Vec<PathBuf> = paths
            .into_iter()
            .map(|p| p.into_path().map_err(|e| e.to_string()))
            .collect::<Result<_, _>>()?;
        let engine = app.state::<Engine>();
        let response = engine
            .client
            .post(format!("{}/api/inputs/local", engine.connection.url))
            .bearer_auth(&engine.connection.token)
            .header("X-Pheno-Ranker-Local", &engine.local_token)
            .json(&json!({"paths": paths}))
            .send()
            .map_err(|e| e.to_string())?;
        let mut handles = engine.json(response)?;
        if let Some(items) = handles.as_array_mut() {
            for (item, path) in items.iter_mut().zip(paths.iter()) {
                item["displayPath"] = json!(path.to_string_lossy());
            }
        }
        Ok(handles)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn confirm_action(
    app: tauri::AppHandle,
    title: String,
    message: String,
) -> Result<bool, String> {
    // Native dialogs do not scroll reliably on every desktop backend.
    if message.chars().count() > 4000 || message.lines().count() > 40 {
        return Err("Confirmation is too long to display safely; summarize the selected inputs first.".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .message(message)
            .title(title)
            .buttons(tauri_plugin_dialog::MessageDialogButtons::OkCancel)
            .blocking_show()
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn project_file(app: tauri::AppHandle, operation: String, handle: Option<String>, data: Option<Value>) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if operation != "save" && operation != "open" { return Err("Unknown project operation".into()); }
        let mut body = json!({"data": data});
        if operation == "save" && handle.is_some() {
            body["handle"] = json!(handle);
        } else {
            let dialog = app.dialog().file().add_filter("Pheno-Ranker project", &["phenoranker"]);
            let selected = if operation == "save" {
                dialog.set_file_name("project.phenoranker").blocking_save_file()
            } else { dialog.blocking_pick_file() };
            let Some(selected) = selected else { return Ok(Value::Null) };
            let mut path = selected.into_path().map_err(|e| e.to_string())?;
            if operation == "save" && path.extension().is_none() { path.set_extension("phenoranker"); }
            if operation == "open" && !app.dialog().message("Open this project and authorize access to its referenced input files? Only open projects from a trusted source. Original files will not be modified.").title("Open project").buttons(tauri_plugin_dialog::MessageDialogButtons::OkCancel).blocking_show() {
                return Ok(Value::Null);
            }
            body["path"] = json!(path);
        }
        let engine = app.state::<Engine>();
        let response = engine.client.post(format!("{}/api/projects/local/{}", engine.connection.url, operation))
            .bearer_auth(&engine.connection.token).header("X-Pheno-Ranker-Local", &engine.local_token)
            // Project-owned example files may be copied to an external drive.
            .timeout(Duration::from_secs(300))
            .json(&body).send().map_err(|e| e.to_string())?;
        engine.json(response)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
fn finish_quit(app: tauri::AppHandle) {
    app.state::<ExitApproval>().0.store(true, Ordering::SeqCst);
    app.exit(0);
}

struct ExitApproval(AtomicBool);

fn open_os(target: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let result = Command::new("open").arg(target).spawn();
    #[cfg(target_os = "linux")]
    let result = Command::new("xdg-open").arg(target).spawn();
    #[cfg(windows)]
    let result = Command::new("explorer.exe").arg(target).spawn();
    result.map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    if ![
        "https://cnag-biomedical-informatics.github.io/pheno-ranker/",
        "https://github.com/CNAG-Biomedical-Informatics/pheno-ranker",
        "https://cnag-biomedical-informatics.github.io/sql.js-httpvfs-playground/",
    ]
    .contains(&url.as_str())
    {
        return Err("This external link is not allowed".into());
    }
    open_os(&url)
}

fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 128
        && id
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
}

#[tauri::command]
async fn reveal_run(app: tauri::AppHandle, id: String) -> Result<(), String> {
    if !valid_id(&id) {
        return Err("Invalid run identifier".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let engine = app.state::<Engine>();
        let response = engine
            .client
            .get(format!("{}/api/jobs/{id}", engine.connection.url))
            .bearer_auth(&engine.connection.token)
            .send()
            .map_err(|e| e.to_string())?;
        let job = engine.json(response)?;
        let path = job["directory"]
            .as_str()
            .ok_or("This run has no output folder")?;
        open_os(path)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn save_output(
    app: tauri::AppHandle,
    job: String,
    artifact: String,
    filename: String,
) -> Result<(), String> {
    if !valid_id(&job) || !valid_id(&artifact) {
        return Err("Invalid output identifier".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let filename = PathBuf::from(filename)
            .file_name()
            .ok_or("Invalid filename")?
            .to_string_lossy()
            .into_owned();
        let Some(selected) = app
            .dialog()
            .file()
            .set_file_name(filename)
            .blocking_save_file()
        else {
            return Ok(());
        };
        let target = selected.into_path().map_err(|e| e.to_string())?;
        let engine = app.state::<Engine>();
        let mut response = engine
            .client
            .get(format!(
                "{}/api/jobs/{job}/outputs/{artifact}/download",
                engine.connection.url
            ))
            .bearer_auth(&engine.connection.token)
            .timeout(Duration::from_secs(3600))
            .send()
            .map_err(|e| e.to_string())?
            .error_for_status()
            .map_err(|e| e.to_string())?;
        // Stream to a sibling temporary file; a failed download never replaces the destination.
        let mut staged =
            tempfile::NamedTempFile::new_in(target.parent().ok_or("Invalid destination")?)
                .map_err(|e| e.to_string())?;
        response
            .copy_to(staged.as_file_mut())
            .map_err(|e| e.to_string())?;
        staged.as_file().sync_all().map_err(|e| e.to_string())?;
        staged.persist(target).map_err(|e| e.to_string())?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn save_yaml_copy(app: tauri::AppHandle, text: String) -> Result<Option<String>, String> {
    if text.len() > 1048576 {
        return Err("YAML exceeds the 1 MiB editor limit".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let Some(selected) = app
            .dialog()
            .file()
            .set_file_name("pheno-ranker-settings.yaml")
            .add_filter("YAML file", &["yaml", "yml"])
            .blocking_save_file()
        else {
            return Ok(None);
        };
        let target = selected.into_path().map_err(|e| e.to_string())?;
        if target.exists() {
            return Err(
                "Choose a new filename. Save As never overwrites an existing YAML file.".into(),
            );
        }
        write_yaml_copy(&target, &text)?;
        Ok(Some(target.to_string_lossy().into_owned()))
    })
    .await
    .map_err(|e| e.to_string())?
}

fn write_yaml_copy(target: &std::path::Path, text: &str) -> Result<(), String> {
    let mut staged = tempfile::NamedTempFile::new_in(target.parent().ok_or("Invalid destination")?)
        .map_err(|e| e.to_string())?;
    staged
        .write_all(text.as_bytes())
        .map_err(|e| e.to_string())?;
    staged.as_file().sync_all().map_err(|e| e.to_string())?;
    // No-clobber protects both original YAML files and files created after the dialog.
    staged
        .persist_noclobber(target)
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn menus(app: &tauri::App) -> tauri::Result<Menu<tauri::Wry>> {
    let action = |id, label, shortcut| MenuItem::with_id(app, id, label, true, shortcut);
    let about = action("about", "About Pheno-Ranker", None)?;
    let settings = action("settings", "Settings...", Some("CmdOrCtrl+,"))?;
    let file = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &action("new", "New Project", Some("CmdOrCtrl+N"))?,
            &action("open", "Open Project...", Some("CmdOrCtrl+O"))?,
            &action("save", "Save Project", Some("CmdOrCtrl+S"))?,
            &action("save-as", "Save Project As...", Some("CmdOrCtrl+Shift+S"))?,
            &action("close-project", "Close Project", None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &action("quit", "Exit Pheno-Ranker", if cfg!(target_os = "macos") { None } else { Some("Ctrl+Q") })?,
        ],
    )?;
    let edit = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;
    let view = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &action("toggle-sidebar", "Show/Hide Run Sidebar", Some("CmdOrCtrl+B"))?,
            &action("toggle-fullscreen", "Toggle Full Screen", Some("F11"))?,
        ],
    )?;
    let conversion = Submenu::with_items(
        app,
        "Analysis",
        true,
        &[&action("run", "Run Operation", Some("CmdOrCtrl+Enter"))?],
    )?;
    let runs = Submenu::with_items(
        app,
        "Runs",
        true,
        &[
            &action("cancel", "Cancel Selected Run...", None)?,
            &action("cancel-pending", "Cancel Pending Runs...", None)?,
            &PredefinedMenuItem::separator(app)?,
            &action(
                "delete-history",
                "Delete All Finished Runs from History...",
                None,
            )?,
            &action("delete-files", "Delete All Finished Run Files...", None)?,
        ],
    )?;
    let help = Submenu::with_items(
        app,
        "Help",
        true,
        &[
            &action("docs", "Documentation", None)?,
            &action("playground", "Explore Published Comparison Results", None)?,
            &action("github", "GitHub Repository", None)?,
            &action("updates", "Check for Updates...", None)?,
        ],
    )?;
    #[cfg(target_os = "macos")]
    {
        let application = Submenu::with_items(
            app,
            "Pheno-Ranker",
            true,
            &[
                &about,
                &settings,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::services(app, None)?,
                &PredefinedMenuItem::hide(app, None)?,
                &PredefinedMenuItem::hide_others(app, None)?,
                &PredefinedMenuItem::show_all(app, None)?,
                &PredefinedMenuItem::quit(app, None)?,
            ],
        )?;
        Menu::with_items(
            app,
            &[&application, &file, &edit, &view, &conversion, &runs, &help],
        )
    }
    #[cfg(not(target_os = "macos"))]
    {
        edit.append(&settings)?;
        help.append(&about)?;
        Menu::with_items(app, &[&file, &edit, &view, &conversion, &runs, &help])
    }
}

#[cfg(target_os = "linux")]
fn sync_native_title(window: &tauri::WebviewWindow) -> tauri::Result<()> {
    use gtk::prelude::*;
    let native = window.gtk_window()?;
    // Tao's Wayland decoration keeps its initial title in a separate HeaderBar
    // inside an EventBox. Bind it to the window title so project names update.
    // X11 without a custom title bar needs no extra handling.
    if let Some(widget) = native.titlebar() {
        let header = widget.clone().downcast::<gtk::HeaderBar>().ok().or_else(|| {
            widget.downcast::<gtk::Bin>().ok()?.child()?.downcast::<gtk::HeaderBar>().ok()
        });
        if let Some(header) = header {
            native.bind_property("title", &header, "title").sync_create().build();
        }
    }
    Ok(())
}

fn main() {
    #[cfg(target_os = "linux")]
    if !Path::new("/dev/dri").exists()
        && std::env::var_os("WEBKIT_DISABLE_COMPOSITING_MODE").is_none()
    {
        // Avoid WebKitGTK's EGL/DRI3 probe on software-only virtual machines.
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            app.manage(ExitApproval(AtomicBool::new(false)));
            app.manage(start_engine(app)?);
            app.set_menu(menus(app)?)?;
            #[cfg(target_os = "linux")]
            if let Some(window) = app.get_webview_window("main") {
                sync_native_title(&window)?;
            }
            // Exercise the packaged application and its real startup hook in CI.
            if std::env::var_os("PHENO_RANKER_DESKTOP_SMOKE_TEST").is_some() {
                println!("Desktop startup smoke test passed");
                app.handle().exit(0);
            }
            Ok(())
        })
        .on_menu_event(|app, event| {
            if event.id().as_ref() == "toggle-fullscreen" {
                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(fullscreen) = window.is_fullscreen() {
                        if let Err(error) = window.set_fullscreen(!fullscreen) {
                            eprintln!("Cannot toggle full screen: {error}");
                        }
                    }
                }
                return;
            }
            if matches!(event.id().as_ref(), "about" | "updates") {
                let app = app.clone();
                let update = event.id().as_ref() == "updates";
                tauri::async_runtime::spawn_blocking(move || {
                    let message = if update {
                        release_check::check(env!("PHENO_RANKER_VERSION"))
                            .unwrap_or_else(|error| format!("Could not check for updates. {error}\n\nTry again later or visit the GitHub repository from Help."))
                    } else {
                        format!(concat!(
                            "Pheno-Ranker\nVersion {}\n\n",
                            "Similarity analysis of categorical records\n\n",
                            "Components\n",
                            "Tauri (Rust) - native desktop integration\n",
                            "React - user interface\n",
                            "Plotly.js - interactive MDS/UMAP plots and heatmaps\n",
                            "UMAP-learn - UMAP projections (BSD-3-Clause)\n",
                            "NumPy, SciPy, scikit-learn - numerical computation\n",
                            "Numba, llvmlite, PyNNDescent - UMAP computation and neighbour search\n",
                            "Cytoscape.js - interactive network visualization\n",
                            "PDF.js - local PDF report preview\n",
                            "Pheno-Ranker - core ranking engine\n",
                            "Mojolicious - local API service\n",
                            "Built with TypeScript and Vite\n\n",
                            "Manuel Rueda\nCNAG\nArtistic License 2.0\n",
                            "Third-party components retain their own licenses.\n\n",
                            "Human Phenotype Ontology (HPO) and its annotations retain their own licensing terms and applicable source-data requirements, including those for the OMIM/ORPHA-derived profiles.\n",
                            "https://hpo.jax.org/data/annotations"
                        ), env!("PHENO_RANKER_VERSION"))
                    };
                    app.dialog().message(message).title(if update { "Pheno-Ranker updates" } else { "About Pheno-Ranker" }).blocking_show();
                });
                return;
            }
            let _ = app.emit("desktop-menu", event.id().as_ref());
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if !window.state::<ExitApproval>().0.load(Ordering::SeqCst) {
                    api.prevent_close();
                    let _ = window.emit("desktop-menu", "quit");
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            project_file,
            finish_quit,
            confirm_action,
            connection,
            select_paths,
            open_external,
            reveal_run,
            save_output,
            save_yaml_copy,
        ])
        .build(tauri::generate_context!())
        .expect("Could not start Pheno-Ranker desktop");
    app.run(|app, event| {
        if let tauri::RunEvent::ExitRequested { api, .. } = &event {
            if std::env::var_os("PHENO_RANKER_DESKTOP_SMOKE_TEST").is_none() && !app.state::<ExitApproval>().0.load(Ordering::SeqCst) {
                api.prevent_exit();
                let _ = app.emit("desktop-menu", "quit");
            }
        }
        if let tauri::RunEvent::Exit = event {
            app.state::<Engine>().stop();
        }
    });
}

#[cfg(test)]
mod native_file_tests {
    use super::write_yaml_copy;

    #[cfg(feature = "custom-protocol")]
    #[test]
    fn standalone_build_embeds_frontend_entrypoint() {
        let context: tauri::Context<tauri::Wry> = tauri::generate_context!();
        assert!(context.assets().get(&"index.html".into()).is_some());
    }

    #[test]
    fn yaml_copy_is_atomic_and_never_overwrites() {
        let directory = tempfile::tempdir().unwrap();
        let target = directory.path().join("config.yaml");
        write_yaml_copy(&target, "format: JSON\n").unwrap();
        assert_eq!(std::fs::read_to_string(&target).unwrap(), "format: JSON\n");
        assert!(write_yaml_copy(&target, "changed: true\n").is_err());
        assert_eq!(std::fs::read_to_string(&target).unwrap(), "format: JSON\n");
    }
}
