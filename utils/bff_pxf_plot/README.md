# HOW TO RUN

```bash
usage: bff-pxf-plot [-h] -i INPUT [-o OUTPUT] [-v]

Process BFF/PXF (JSON or YAML) data and generate a self-contained HTML report.

options:
  -h, --help            show this help message and exit
  -i INPUT, --input INPUT
                        Input JSON or YAML file path (e.g., "data.json" or "data.yaml").
  -o OUTPUT, --output OUTPUT
                        Output HTML file path (default: "output_plots.html")
  -v, --verbose         Increase output verbosity

```

Example:

```bash
./bff-pxf-plot -i individuals.json
```

Generate a portable HTML report that can be opened locally or embedded in an
application:

```bash
./bff-pxf-plot -i individuals.json -o individuals-report.html
```

Open the HTML file in a browser. It contains vector charts, tables and local
filtering; it does not load scripts, fonts, or other assets from the internet.
HTML replaces PNG output from v1.09.

Each panel shows either the number of entries per record or categorical record
counts and percentages. Missing categories are included as `Unknown`, so the
denominator is the full cohort. When there are more than seven categories, the
remaining categories are combined into a labelled group. Schema field names retain
their original capitalization. Entry counts describe data coverage, not severity.

Sex is shown as a pie chart with counts and percentages in its legend. Other
categories use horizontal bars. Empty sections are listed without chart panels; distributions
with entries include mean and median markers. A short summary table precedes the charts.
The Pheno-Ranker logo is embedded, so the report needs no separate image files.

The report includes mean, median, quartiles, 10th/90th percentiles and range of entries per record, section coverage,
and the most frequent phenotype and disease IDs. Full term tables can be filtered
by label or ID. Each term is counted once per record per status; excluded phenotypes
have their own chart and table. Excluded diseases are omitted from disease frequencies.
Missing ontology IDs are reported and omitted from frequencies, not entry counts.

Entry distributions include duplicates and excluded annotations, with missing
sections counted as zero. Records can represent people or disease profiles:
descriptor counts reflect available annotations, not necessarily disease complexity
or annotation quality. Frequencies are not population prevalence estimates.

A separate distribution counts unique non-excluded phenotype IDs per record.
It deduplicates IDs, omits entries without IDs and excluded annotations, and keeps
records with zero qualifying IDs. Raw entry counts remain available alongside it.
Percentiles use linear interpolation at `(N - 1) * p` in the sorted counts;
fractional results are possible. For a single record, all percentiles equal its count.

Local tests: `python3 -m unittest discover -s utils/bff_pxf_plot/tests -v`.

# INSTALLATION

It should work out of the box with the containerized version. Otherwise:

```
pip install matplotlib PyYAML
```

# AUTHOR 

Written by Manuel Rueda, PhD. Info about CNAG can be found at [https://www.cnag.eu](https://www.cnag.eu).

# COPYRIGHT AND LICENSE

This Python file is copyrighted. See the LICENSE file included in this distribution.
