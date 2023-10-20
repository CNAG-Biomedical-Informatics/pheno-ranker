## Usage

When using the `Pheno-ranker` command-line interface, simply ensure the [correct syntax](https://github.com/cnag-biomedical-informatics/pheno-ranker#synopsis) is provided.

=== "Against one cohort"

    Example:

    ```
    pheno-ranker -r individuals.json -t patient.json
    ```
    
    !!! Question "How do I extract one or many patients from a cohort file?"

        `pheno-ranker -r t/individuals.json --patients-of-interest 107:week_0_arm_1 125:week_0_arm_1`

        This command will carry out a dry-run, creating `107:week_0_arm_1.json` and `125:week_0_arm_1.json` files.
        In the example above, I renamed `107:week_0_arm_1.json` to `patient.json` by typing this:
       
        `mv 107:week_0_arm_1.json patient.json`         

    This will create the text file `rank.txt`.

    --8<-- "tbl/rank-one.md"

    !!! Abstract "Obtaining additional information on the alignments"

        You can create several files related to the alignment by adding `--align`.

        ```
        pheno-ranker -r individuals.json -t patient.json --align
        ```

        or

        ```
        pheno-ranker -r individuals.json -t patient.json --align my_fav_preffix
        ```

=== "Against multiple cohorts"

    Example:

    The process mirrors handling a single cohort; the sole distinction is the addition of a prefix to each `primary_key`, enabling us to trace the origin of every individual.

    Let's reuse `individuals.json` to have the impression of having more than one cohort.

    ```
    pheno-ranker -r individuals.json individuals.json individuals.json -t patient.json --max-out 10 -o rank_multiple.txt
    ```

    This will create the text file `rank_multiple.txt`.

    --8<-- "tbl/rank-multiple.md"

    !!! Question "Why the distance is equal to `1` and not `0` if the three cohorts are identtical?"

        Because by default we are including the `primary_key` (`id`in this case).
        You can exclude it by adding `--exclude-terms id`.
