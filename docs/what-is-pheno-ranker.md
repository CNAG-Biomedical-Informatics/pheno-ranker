# What is Pheno-Ranker?

`Pheno-Ranker` is an **open-source** software toolkit for _individual-level_ comparison of phenotypic, clinical, and other categorical records. It was designed for GA4GH-oriented data such as [Beacon v2](bff.md) and [Phenopackets v2](pxf.md), but it can also compare generic `JSON`, `YAML`, and `CSV`-derived datasets.

The central idea is simple: hierarchical records are flattened, transformed into one-hot encoded binary vectors, and compared with metrics such as [Hamming distance](https://en.wikipedia.org/wiki/Hamming_distance) and [Jaccard similarity](https://en.wikipedia.org/wiki/Jaccard_index). This makes the same command-line workflow useful for cohort exploration, patient matching, clustering, multidimensional scaling, and graph analytics.

## Key Features

- Native support for [BFF](bff.md) and [PXF](pxf.md) inputs.
- Generic `JSON`/`YAML` support through configuration files.
- `CSV` support through the included [csv2pheno-ranker](csv-import.md) utility.
- Cohort mode for all-vs-all comparisons.
- Patient mode for ranking a target profile against a reference cohort.
- Include/exclude filters, variable weights, HPO ascendants, and exported intermediate files for inspection.
- Companion utilities for simulation, plotting, CSV import, and QR-code workflows.

## Main Workflows

| Workflow | Purpose | Main output |
| -- | -- | -- |
| [Cohort mode](cohort.md) | Compare all individuals or records in one or more cohorts. | `matrix.txt` |
| [Patient mode](patient.md) | Rank reference records against a target patient or object. | `rank.txt` |
| [Generic JSON](generic-json.md) | Compare non-GA4GH categorical records using a configuration file. | `matrix.txt` or `rank.txt` |
| [Utilities](implementation.md#utilities) | Prepare, simulate, plot, or encode data around the main ranking workflow. | Utility-specific files |

## How to Use Pheno-Ranker

`Pheno-Ranker` is built on a robust [Perl module](https://metacpan.org/pod/Pheno::Ranker), offering multiple interfaces for flexibility:

- **[Command-line Tool](usage.md#synopsis)**: For direct data processing and automation.
- **[Web App UI](https://pheno-ranker.cnag.eu)**: A user-friendly interface for visual interaction.

Start with [Download & Installation](download-and-installation.md), then follow the [Usage](usage.md), [Cohort mode](cohort.md), or [Patient mode](patient.md) pages depending on your analysis.

## Listen to the Paper: Audio Edition

!!! Abstract "Podcast-Style Audio Format"

    Explore the key insights of [Pheno-Ranker paper](https://bmcbioinformatics.biomedcentral.com/articles/10.1186/s12859-024-05993-2) in audio format! Perfect for learning on the go or through immersive narration.

    <audio controls>
      <source src="../media/pheno-ranker-notebook-llm.mp3" type="audio/mpeg">
      Your browser does not support the audio element.
    </audio>

    Made with [Notebook LM](https://notebooklm.google.com)
