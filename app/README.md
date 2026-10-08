# Pheno-Ranker Desktop

Native Tauri application using the same Perl engine as `bin/pheno-ranker`.
Desktop sources, dependencies and tests are excluded from the CPAN distribution.

The implementation adapts Convert-Pheno Desktop's native integration, job
supervision, project persistence and atomic file handling. Result exploration
adapts COHORTome.

Development requires the repository's Perl dependencies, the desktop Perl
dependencies in `engine/cpanfile`, Node.js, Rust and Tauri's native prerequisites.

```sh
cpanm --installdeps ..
cpanm --installdeps engine
npm install
npm run desktop
```

For UI development, run `npm run desktop:dev` instead. It starts a loopback-only
Vite server and opens the native app. React and CSS edits refresh automatically;
automatic native/backend restarts are disabled. Restart manually only after jobs
finish and project settings are saved. Avoid editing engine or CLI files during
active jobs, since workers may load files from disk. Stop development mode with
Ctrl+C only when it is safe to interrupt jobs. Use `npm run desktop` for long runs
without frontend hot reload.

The frontend is loaded inside Tauri. The application starts its own authenticated
loopback service; it does not require a browser server or Docker.

Projects use `.phenoranker` and a companion `.phenoranker.data` directory.
External inputs remain referenced; project-owned inputs and editor snapshots are
saved with the project. Keep the companion directory beside its project file.

Settings includes a persistent default results folder. A folder selected in Setup
overrides it and is saved with the project. Each custom destination receives a
`pheno-ranker-<run-id>` subfolder. Without either selection, results stay in the
application-managed run folder. Queued jobs retain their submitted destination;
changes apply to newly submitted jobs only. An unavailable default folder causes
an actionable error, rather than silently writing somewhere else. App metadata
and temporary processing still use the platform's application-data directory.

Deleting a run offers history-only removal (the default) or permanent deletion
of history and output files. Custom output parents and original imported files
are retained. Active jobs and outputs used by active jobs are protected. Bulk
file deletion includes runs previously hidden from history.

Tools provides standalone companion utilities. Completed simulator runs offer
**Use in analysis**, selecting `simulated.json`, not the `run.json` execution record.
Analysis runs retain intermediate representations by default (optional in run
settings, with additional disk usage). **Create QR codes** carries the reference
profiles and matching global hash from that run into a new utility setup.
QR encoding with a template retains the dictionary and reconstructs `decoded.json`
from the same vectors using the existing barcode decoder. **Create PDF reports**
then selects those records and all matching QR images. Review BFF/PXF format
before running. These reports reflect encoded terms, not the original full records.
Standalone QR encoding without a template still works, but cannot prepare reports
automatically. A same-sized dictionary from a different analysis is not interchangeable.

PDF outputs open in a local PDF.js preview with page navigation and zoom. Save as
remains available for a full PDF reader. Preview is limited to 32 MiB per file;
only one page is rendered at a time. The viewer and its worker are bundled, with
no external document service or CDN. Canvas previews do not offer text selection.

### Large cohort safeguards

Desktop preflight reads up to 8 MiB across selected inputs. It counts plain JSON
records and recognizes the bundled OMIM/ORPHA gzip files by SHA-256 fingerprint
(6,471 and 2,402 records respectively, in BFF or PXF). Renamed copies work too.
Changed, other compressed, oversized or unfamiliar inputs have an unknown count
and use conservative defaults. Counts are input records, before any ID merging
or filtering. Updating the bundled data requires updating the verified counts.

- Graph export and graph statistics are skipped above 1,500 records or when the
  count is unknown, unless **Allow large graph export** is explicitly enabled.
  Skipped graphs are explained in a neutral note in run details and `run.json`.
  Only explicitly enabling large graphs requires a warning confirmation.
- All jobs honour the configured concurrency limit, regardless of record count.
- MDS and UMAP default to 10,500 records, adjustable independently in Settings.
  Large eigendecompositions can take substantial time and RAM. Heatmap and
  network preview limits remain unchanged; this is not a promise that every
  machine can handle the upper limit. A 10,377-record Hamming MDS benchmark
  completed in 75 seconds with 4.1 GiB peak RAM on the development VM.
  Previously skipped MDS outputs are not automatically recomputed; use
  **Add projection** to reuse a completed run's matrix.
- Matrix output is never sampled or truncated. The CLI's matrix RAM-efficient
  mode does not bound graph memory, input loading, or concurrent job memory.

These are conservative safeguards, not a hard memory limit or a RAM estimate.

### QR results

QR encoding results open in a searchable record browser with 50 records per page.
Only the opened QR image is fetched. Select records to prepare PDF reports for
that subset, or create a PDF for the record being viewed. Decoded profiles are
loaded on request when encoding included the matching global hash; they represent
encoded features rather than the complete original record. Output files remain
available in their own tab.

PDF setup enables label hints by default when the matching template and label
sidecar are supplied. Analysis-to-QR handoffs carry these files for later PDF use;
PNG viewing and decoding do not enrich records. Disable **Include label hints in
PDF** to report the plain decoded profile. Display hints are resolved through
the exact binary-vector positions; no enriched JSON is written.
Input files should remain unchanged after submission. The worker rechecks graph
safety. Run details show
inputs, preflight counts, elapsed time and coarse execution stages, not a fabricated
completion percentage. The CLI defaults are unchanged.

```sh
prove -lr engine/t
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

Builds must bundle their own Perl runtime, compiled metrics, Python utilities and
reference data. `PHENO_RANKER_INLINE_DIR` selects the desktop's isolated compiled
metrics cache; ordinary CLI installations retain their existing cache location.

Build the frozen Python helper, then stage and verify the engine using the
platform's relocatable Perl prefix:

```sh
python3 scripts/build-python-helper.py --root ..
perl scripts/stage-desktop-engine.pl --root .. --perl-prefix /path/to/perl \
  --python-helper build/python/pheno-ranker-helper
perl scripts/test-desktop-engine.pl src-tauri/engine
```

The packaged-engine check runs real HTML summary, QR round-trip, PDF-with-labels,
MDS and UMAP jobs through the frozen Python executable, using temporary synthetic
inputs. It also checks the packaged CLI and both bundled disease references.
To exercise the Python smoke scenarios before freezing, run from the repository root:

```sh
perl app/scripts/test-python-helper.pl --python app/.venv/bin/python
```

Do not publish installers until the packaged-runtime and platform checks pass.

### Release workflow

Run `perl app/scripts/check-release.pl` from the repository root before tagging.
CLI version `1.09` corresponds to Desktop package version `1.9.0`.

- An annotated version tag builds all five Desktop installers into a **draft**
  GitHub release. Manual Desktop runs create compatibility-test prereleases.
- **Publish to CPAN** is dispatched manually with the annotated release tag.
  The workflow checks out that tag and runs `make disttest` before uploading.
- **Docker build (multi-arch)** is dispatched manually with the same tag.
  Leave `publish` unchecked for a build-only run; enable it to publish the
  versioned image and `latest`. The single-architecture workflow publishes only
  a versioned `-amd64` image, leaving the multi-architecture tags untouched.
- Documentation deployment remains manual, as in Convert-Pheno, so documentation
  corrections do not require a software release.

CPAN and Docker publishing do not run on pushes to `main`. Desktop-only sources,
dependencies and bundled datasets remain outside the CPAN distribution.

Compressed OMIM/ORPHA reference bundles are stored separately in
`app/data/precomputed/` and copied into the Desktop package. Rebuild and verify
them with `python3 app/scripts/build-precomputed-references.py` from the repository
root. See that directory's README for settings and provenance. These bundles are
outside CPAN and are reused automatically when analysis settings are compatible.

## Use Cases

In Setup, select patient or cohort mode and **Use cases** to load the bundled
OMIM or ORPHA disease reference. Patient mode also
loads a published example patient and uses Jaccard ranking. Cohort mode runs
all-pairs Hamming comparisons, which may take several minutes; large-result
safeguards may omit graph and MDS previews. Loading replaces inputs
and settings; it does not submit a job.
Both examples work offline. See `engine/examples/README.md` for provenance and
the upstream license. These are demonstration analyses, not diagnostic advice.

**Phenopacket Store collections** downloads versioned official release archives
on request, validates the published checksum, and caches them under the managed
run root's `phenopacket-store/` directory. A separate Perl worker handles downloads
and ZIP parsing without blocking the API. Users can select collections from the
chosen release and combine individual JSONs into one reference array. Duplicate
IDs are rejected, and collection membership stays in provenance rather than
comparison data. Standard single-reference runs publish `collection-labels.json`
for MDS/UMAP and network colouring; custom-config runs retain ordinary cohort
colouring. Projects retain the merged input and provenance without depending on
the download cache. No CLI or CPAN changes are needed for this importer.

**Help > Explore Published Comparison Results** opens the existing online
OMIM/TCGA SQLite playground in the default browser. It queries stored scores,
not new patients, and requires internet access. It is separate from both source
cohorts and precomputed reference hashes.
