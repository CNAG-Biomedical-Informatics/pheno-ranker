# Precomputed disease references

Desktop-only, gzip-compressed reference exports for OMIM and ORPHA. These files
are not part of the CPAN distribution. Each dataset directory contains the four
standard reference files plus the optional labels dictionary and a manifest.

Rebuild from the repository root:

```sh
python3 app/scripts/build-precomputed-references.py
```

The generator uses the bundled PXF references with `phenotypicFeatures` only,
default configuration, and no custom weights, age comparison, HPO ancestor
expansion, or cohort prefixes. The bundled tutorial patient is used to exercise
patient-mode export and validate ranking/alignment; it is not a reference record.
Changing the reference representation settings requires rebuilding the cache.
Other input formats, configurations, or feature selections must not silently
reuse these bundles.

Each manifest records source/configuration checksums, the validation patient,
engine version, feature and record counts, and compressed/uncompressed file
checksums. Gzip timestamps are fixed for reproducible packaging. Generation
verifies that using only the gzip files produces identical ranking and alignment
text/CSV to a fresh run. It does not change fixtures or the source references.

Source provenance: `share/diseases/hpo/README.md`. Patient provenance and license:
`app/engine/examples/README.md` and `app/engine/examples/LICENSE`.

Desktop uses these caches for a single bundled OMIM or ORPHA reference in both
patient and cohort modes when the settings match. Custom configuration, weights,
different term selections, other preparation settings, or multiple reference
cohorts use the original data instead. The input summary shows which route will
be used; execution checks eligibility again. Missing, outdated, or damaged caches
also fall back to the original data.

These are reference-vector caches, not precomputed all-pairs matrices. Cohort
mode still calculates the selected metric for all pairs. Ranking limits, graph
filters, and projection settings do not require rebuilding the reference.
