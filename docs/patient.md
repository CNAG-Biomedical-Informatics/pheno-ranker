## Usage

When using the `pheno-ranker` command-line interface, simply ensure the [correct syntax](https://github.com/cnag-biomedical-informatics/pheno-ranker#synopsis) is provided.

=== "Against one cohort"

    Example:

    ```
    pheno-ranker -r individuals.json -t patient.json
    ```

    This will create the text file `rank.txt`.

    --8<-- "tbl/rank.md"

=== "Against multiple cohorts"

    Example:

    ```
    pheno-ranker -r cohort1.json cohort2,json -t patient.json
    ```
