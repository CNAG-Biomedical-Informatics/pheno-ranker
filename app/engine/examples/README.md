# Offline desktop use cases

`patient.json` is the published `PMID_35344616_A2` phenopacket used in the
Pheno-Ranker OMIM tutorial. The associated disease is OMIM:268310; it is not
guaranteed to rank first. Both the OMIM and ORPHA examples use this unchanged
patient in patient mode and compare phenotypic features only. Cohort mode loads
only the selected disease reference for all-pairs comparison.

Source: https://github.com/monarch-initiative/phenopacket-store

Revision: `254246f24c37b7a1969f5ce533ce9cb0a8a97b30`.
`provenance.json` lists the original source path. The upstream BSD-3-Clause
license is preserved in `LICENSE`. This is a public literature-derived
record, not a synthetic patient. Use for demonstration, not clinical diagnosis.

The references are the existing `share/diseases/hpo/omim.pxf.json.gz` and
`share/diseases/hpo/orpha.pxf.json.gz`,
derived from HPO annotations downloaded January 25, 2025. See the README in that
directory for its provenance and citation. The app packages both the source
reference and these examples; it does not download data when loading a use case.
