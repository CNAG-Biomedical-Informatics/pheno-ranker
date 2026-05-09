# Use from R

`Pheno-Ranker` can be combined with R either by reading outputs from a command-line run or by launching the `pheno-ranker` command from inside R.

This keeps the workflow simple:

- no Perl-to-R bridge is required
- the same command works in R scripts, R Markdown, Quarto, notebooks, and pipelines
- `matrix.txt`, `rank.txt`, `matrix.mtx`, and exported `JSON` files can be consumed by common R packages

## Two R usage patterns

There are two common ways to combine `Pheno-Ranker` and R:

| Pattern | What runs `pheno-ranker`? | What R does |
| --- | --- | --- |
| CLI first, R later | Your shell, terminal, workflow manager, or batch script | Reads and post-processes existing outputs such as `matrix.txt`, `rank.txt`, or `graph.json` |
| R orchestrates the CLI | R, through `system2()` | Builds the command arguments, runs `pheno-ranker`, checks that output files exist, then reads them |

Both patterns are valid. Use **CLI first, R later** when you already have output files and only need plotting, MDS, filtering, or matrix transformations. Use **R orchestrates the CLI** when your R script or notebook should run the full analysis end to end.

## Before you start

Make sure `pheno-ranker` is available in your shell:

```r
Sys.which("pheno-ranker")
```

If it is not in your `PATH`, use the full path to the executable:

```r
pheno_ranker <- "/path/to/pheno-ranker"
```

Otherwise:

```r
pheno_ranker <- "pheno-ranker"
```

## Minimal R helper

For most R scripts, define one small helper and reuse it. It runs `pheno-ranker`, captures messages, and stops with the captured log if the expected output was not created.

```r
run_pheno_ranker <- function(args, output, executable = "pheno-ranker") {
  log <- system2(
    executable,
    args = args,
    stdout = TRUE,
    stderr = TRUE
  )

  if (!file.exists(output)) {
    stop(paste(log, collapse = "\n"))
  }

  output
}
```

Then call it with the same arguments you would use in the terminal:

```r
matrix_file <- run_pheno_ranker(
  args = c("-r", "individuals.json", "-o", "matrix.txt"),
  output = "matrix.txt"
)

matrix <- as.matrix(
  read.table(matrix_file, header = TRUE, row.names = 1, check.names = FALSE, sep = "\t")
)
```

## Quick recipes

| Goal | CLI output | R reader |
| --- | --- | --- |
| Cohort comparison | `matrix.txt` | `read.table(..., row.names = 1)` |
| Patient matching | `rank.txt` | `read.delim(..., check.names = FALSE)` |
| Large sparse matrix | `matrix.mtx` | `Matrix::readMM()` |
| Coverage and intermediate files | `export.*.json` | `jsonlite::fromJSON()` |
| Graph export | `graph.json` | `jsonlite::fromJSON()` |

## Cohort mode from R

Run an all-vs-all cohort comparison and read the dense matrix back into R.

```r
pheno_ranker <- "pheno-ranker"

workdir <- tempfile("pheno-ranker-")
dir.create(workdir)

matrix_file <- file.path(workdir, "matrix.txt")

run_pheno_ranker(
  args = c(
    "-r", "individuals.json",
    "-o", matrix_file
  ),
  output = matrix_file,
  executable = pheno_ranker
)

matrix <- as.matrix(
  read.table(
    matrix_file,
    header = TRUE,
    row.names = 1,
    check.names = FALSE,
    sep = "\t"
  )
)

matrix[1:5, 1:5]
```

??? Example "Example matrix preview"

    A dense cohort matrix is read as a numeric matrix with record identifiers in both rows and columns. The expression `matrix[1:5, 1:5]` prints a preview like this in the R console:

    ```text
                       107:week_0_arm_1 107:week_2_arm_1 107:week_14_arm_1
    107:week_0_arm_1                  0               24                23
    107:week_2_arm_1                 24                0                 3
    107:week_14_arm_1                23                3                 0
    125:week_0_arm_1                  6               22                21
    125:week_2_arm_1                 23                3                 2
                       125:week_0_arm_1 125:week_2_arm_1
    107:week_0_arm_1                  6               23
    107:week_2_arm_1                 22                3
    107:week_14_arm_1                21                2
    125:week_0_arm_1                  0               21
    125:week_2_arm_1                 21                0
    ```

You can then use the matrix with common R tooling:

```r
heatmap(matrix, symm = TRUE)

mds <- cmdscale(as.dist(matrix), k = 2)
plot(mds, pch = 19, xlab = "MDS1", ylab = "MDS2")
text(mds, labels = rownames(matrix), pos = 3, cex = 0.7)
```

## Patient mode from R

Run patient mode and read `rank.txt` as a data frame.

```r
pheno_ranker <- "pheno-ranker"

workdir <- tempfile("pheno-ranker-")
dir.create(workdir)

rank_file <- file.path(workdir, "rank.txt")

run_pheno_ranker(
  args = c(
    "-r", "individuals.json",
    "-t", "patient.json",
    "-o", rank_file
  ),
  output = rank_file,
  executable = pheno_ranker
)

rank <- read.delim(rank_file, check.names = FALSE)

head(rank)
```

??? Example "Example ranking preview"

    `rank.txt` is read as a data frame. The expression `head(rank[, c("RANK", "REFERENCE(ID)", "TARGET(ID)", "HAMMING-DISTANCE", "JACCARD-INDEX", "COMPLETENESS(%)")])` prints a preview like this in the R console:

    ```text
      RANK    REFERENCE(ID)       TARGET(ID) HAMMING-DISTANCE JACCARD-INDEX
    1    1 107:week_0_arm_1 107:week_0_arm_1                0         1.000
    2    2 125:week_0_arm_1 107:week_0_arm_1                6         0.924
    3    3 275:week_0_arm_1 107:week_0_arm_1               14         0.837
    4    4 215:week_0_arm_1 107:week_0_arm_1               16         0.818
    5    5 305:week_0_arm_1 107:week_0_arm_1               18         0.798
      COMPLETENESS(%)
    1          100.00
    2           97.33
    3           88.89
    4           86.75
    5           85.54
    ```

The most useful columns for quick filtering are usually:

- `RANK`
- `REFERENCE(ID)`
- `TARGET(ID)`
- `HAMMING-DISTANCE`
- `JACCARD-INDEX`
- `INTERSECT`
- `COMPLETENESS(%)`

For example:

```r
best_matches <- subset(rank, `JACCARD-INDEX` >= 0.8)
best_matches[order(best_matches$`HAMMING-DISTANCE`), ]
```

## Passing more arguments

Pass additional `pheno-ranker` options by adding them to the `args` vector. Each command-line option and each value should be a separate character string.

```r
args <- c(
  "-r", "individuals.json",
  "--include-terms", "phenotypicFeatures", "diseases",
  "--similarity-metric-cohort", "jaccard",
  "--cytoscape-json", "graph.json",
  "--graph-stats", "graph_stats.txt",
  "-o", "matrix.txt"
)

system2("pheno-ranker", args = args)
```

The pattern is the same for options that take one value, multiple values, or no value:

```r
args <- c(
  "-r", "movies.json",
  "--config", "movies_config.yaml",
  "--exclude-terms", "runtime", "description",
  "--max-number-vars", "5000",
  "--export",
  "-o", "matrix.txt"
)
```

For patient mode:

```r
args <- c(
  "-r", "individuals.json",
  "-t", "patient.json",
  "--sort-by", "jaccard",
  "--max-out", "20",
  "--align",
  "-o", "rank.txt"
)

system2("pheno-ranker", args = args)
rank <- read.delim("rank.txt", check.names = FALSE)
```

For large cohort runs:

```r
args <- c(
  "-r", "individuals.json",
  "--matrix-format", "mtx",
  "--max-matrix-records-in-ram", "5000",
  "-o", "matrix.mtx"
)

system2("pheno-ranker", args = args)
```

For repeated analyses, build a base argument vector and append the parts that change.

```r
base_args <- c(
  "-r", "individuals.json",
  "--include-terms", "phenotypicFeatures", "diseases",
  "--similarity-metric-patient", "jaccard"
)

run_patient <- function(target, out_file) {
  args <- c(
    base_args,
    "-t", target,
    "--max-out", "25",
    "-o", out_file
  )

  log <- system2("pheno-ranker", args = args, stdout = TRUE, stderr = TRUE)

  if (!file.exists(out_file)) {
    stop(paste(log, collapse = "\n"))
  }

  read.delim(out_file, check.names = FALSE)
}

rank <- run_patient("patient.json", "rank.txt")
```

:::tip Argument safety
Avoid building one long pasted shell command. With `system2()`, use `args = c(...)` so R passes each argument safely, including paths with spaces.
:::

## Batch patient matching

For many target patients, loop over target files and run one patient-mode job per target.

```r
pheno_ranker <- "pheno-ranker"

targets <- list.files("targets", pattern = "\\.json$", full.names = TRUE)
workdir <- tempfile("pheno-ranker-batch-")
dir.create(workdir)

results <- lapply(targets, function(target) {
  rank_file <- file.path(
    workdir,
    paste0(tools::file_path_sans_ext(basename(target)), ".rank.txt")
  )

  log <- system2(
    pheno_ranker,
    args = c(
      "-r", "individuals.json",
      "-t", target,
      "-o", rank_file
    ),
    stdout = TRUE,
    stderr = TRUE
  )

  if (!file.exists(rank_file)) {
    stop(paste(log, collapse = "\n"))
  }

  rank <- read.delim(rank_file, check.names = FALSE)
  rank$TARGET_FILE <- basename(target)
  rank
})

all_ranks <- do.call(rbind, results)
```

## Exported JSON files

Use `--export` when you want to inspect coverage, hashes, or binary-vector representations from R.

```r
library(jsonlite)

workdir <- tempfile("pheno-ranker-export-")
dir.create(workdir)

old <- setwd(workdir)
on.exit(setwd(old), add = TRUE)

log <- system2(
  "pheno-ranker",
  args = c(
    "-r", "/path/to/individuals.json",
    "--export",
    "-o", "matrix.txt"
  ),
  stdout = TRUE,
  stderr = TRUE
)

coverage <- fromJSON("export.coverage_stats.json")
str(coverage)
```

## Matrix Market output

For large cohort runs, dense matrices can be inconvenient in R. If your downstream analysis accepts sparse matrices, write Matrix Market output and read it with the `Matrix` package.

```r
library(Matrix)

system2(
  "pheno-ranker",
  args = c(
    "-r", "individuals.json",
    "--matrix-format", "mtx",
    "-o", "matrix.mtx"
  )
)

sparse_matrix <- readMM("matrix.mtx")
sparse_matrix
```

:::tip Choosing the output
Use dense `matrix.txt` when you want base R compatibility and simple plotting. Use `matrix.mtx` when the cohort is large and your downstream tools can work with sparse matrices.
:::

## Practical notes

- Use `system2()` with an argument vector instead of pasting a shell command. This is safer across Linux, macOS, and Windows.
- Prefer `tempfile()` or `tempdir()` for temporary outputs in scripts and tests.
- Capture `stdout` and `stderr`; if an output file is missing, print the captured log.
- For repeated patient matching against a large reference cohort, consider exporting reference data once and using the reuse options described in [Usage](usage.md).
