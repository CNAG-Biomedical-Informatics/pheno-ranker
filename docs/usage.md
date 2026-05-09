# Usage

This page summarizes the `pheno-ranker` command-line interface, which is the primary way to run `Pheno-Ranker`. For setup, see [Download & Installation](download-and-installation.md).

The Perl CLI is tested on Linux, macOS, and Windows. On Windows, use Docker, WSL, or a Perl environment such as Strawberry Perl.

## Synopsis

```bash
pheno-ranker -r <reference.json> [options]
pheno-ranker -r <reference.json> -t <target.json> [options]
```

Input files can be `JSON`, `YAML`, or gzip-compressed files. The default configuration is `share/conf/config.yaml`.

## Common Workflows

### Cohort Mode

Compare all records in the reference cohort against each other:

```bash
pheno-ranker -r individuals.json -o matrix.txt
```

Switch the cohort similarity metric:

```bash
pheno-ranker -r individuals.json --similarity-metric-cohort jaccard
```

### Patient Mode

Rank reference records against a target patient or object:

```bash
pheno-ranker -r individuals.json -t patient.json -o rank.txt
```

Limit the number of printed comparisons:

```bash
pheno-ranker -r individuals.json -t patient.json --max-out 10
```

Select the ranking metric:

```bash
pheno-ranker -r individuals.json -t patient.json --sort-by jaccard
```

### Generic JSON Mode

Use a custom configuration to compare categorical records beyond BFF/PXF:

```bash
pheno-ranker -r movies.json --config movies_config.yaml --include-terms genre year director
```

Use `--include-terms` or `--exclude-terms` to control which configured fields are represented in the binary vectors.

### Precomputed Reference Mode

Reuse exported reference vectors for repeated patient matching:

```bash
pheno-ranker -r individuals.json --export ref_cache
pheno-ranker --precomputed-ref-prefix ref_cache -t patient.json
```

### Graph Export

Write a Cytoscape-compatible graph directly from cohort comparisons:

```bash
pheno-ranker -r individuals.json --cytoscape-json graph.json
```

Filter graph edges by weight:

```bash
pheno-ranker -r individuals.json --cytoscape-json graph.json --graph-max-weight 10
pheno-ranker -r individuals.json --cytoscape-json graph.json --graph-min-weight 0.5
```

Write graph statistics:

```bash
pheno-ranker -r individuals.json --cytoscape-json graph.json --graph-stats graph_stats.txt
```

## Output Files

| Output | Created by | Purpose |
| -- | -- | -- |
| `matrix.txt` | Cohort mode | Dense all-vs-all comparison matrix. |
| `rank.txt` | Patient mode | Ranked matches against the target patient or object. |
| `alignment*` | `--align` in patient mode | Variable-level reference-target alignment details. |
| `export.*.json` | `--export` | Intermediate hashes, binary vectors, and coverage statistics. |
| `graph.json` | `--cytoscape-json` | Cytoscape-compatible graph for network analysis. |
| `graph_stats.txt` | `--graph-stats` | Summary statistics for graph output. |
| `matrix.mtx` | `--matrix-format mtx` | Optional sparse Matrix Market output for large matrix workflows. |

## Frequently Used Options

| Option | Purpose |
| -- | -- |
| `-r, --reference <file>` | Reference JSON/YAML BFF/PXF file, supports `.gz`. |
| `-t, --target <file>` | Target patient/object file for patient mode, supports `.gz`. |
| `-o, --out-file <file>` | Output file path. Defaults to `matrix.txt` or `rank.txt`. |
| `--config <file>` | YAML configuration file. |
| `--include-terms <terms>` | Include selected BFF/PXF terms or configured JSON fields. |
| `--exclude-terms <terms>` | Exclude selected BFF/PXF terms or configured JSON fields. |
| `--weights <file>` | YAML file with weights. |
| `--matrix-format <dense|mtx>` | Matrix output format in cohort mode. |
| `--max-matrix-records-in-ram <number>` | Record threshold before switching to RAM-efficient cohort mode. |
| `--similarity-metric-cohort <hamming|jaccard>` | Similarity metric for cohort mode. |
| `--sort-by <hamming|jaccard>` | Sorting metric for patient mode. |
| `--cytoscape-json [file]` | Write a Cytoscape-compatible graph. |
| `--graph-min-weight <number>` | Keep graph edges with weight greater than or equal to this value. |
| `--graph-max-weight <number>` | Keep graph edges with weight less than or equal to this value. |
| `--graph-stats [file]` | Write graph summary statistics. |
| `--export [prefix]` | Export intermediate JSON files. |
| `--align [prefix]` | Write alignment files. |
| `--precomputed-ref-prefix [prefix]` | Use precomputed reference-cohort data. |

## Help

Print command-line help:

```bash
pheno-ranker --help
```

Print the installed version:

```bash
pheno-ranker --version
```

`--man` is deprecated. Use this page and `--help` for current CLI usage.
