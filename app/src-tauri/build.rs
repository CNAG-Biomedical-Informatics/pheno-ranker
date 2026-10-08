fn main() {
    println!("cargo:rerun-if-changed=../../VERSION");
    let version = std::fs::read_to_string("../../VERSION").expect("Read CLI VERSION");
    let version = version.trim();
    let (major, minor) = version.split_once('.').expect("CLI version must be major.minor");
    let desktop_version = format!("{}.{}.0", major.parse::<u32>().unwrap(), minor.parse::<u32>().unwrap());
    assert_eq!(std::env::var("CARGO_PKG_VERSION").unwrap(), desktop_version, "Desktop version must match CLI VERSION");
    println!("cargo:rustc-env=PHENO_RANKER_VERSION={version}");
    println!("cargo:rerun-if-changed=../dist");
    if std::env::var_os("CARGO_FEATURE_CUSTOM_PROTOCOL").is_some() {
        assert!(
            std::path::Path::new("../dist/index.html").is_file(),
            "Frontend assets are missing. Run npm run build in app/ before building the desktop executable."
        );
    }
    tauri_build::build()
}
