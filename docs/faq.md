Frequently Asked Questions

## General

??? faq "What does `Pheno-Ranker` do?"

    Advancing Semantic Similarity Analysis of Phenotypic Data Stored in GA4GH Standards and Beyond

    ##### last change 2023-09-23 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "Is `Pheno-Ranker` free?"

    Yes. See the [license](https://github.com/mrueda/pheno-ranker/blob/main/LICENSE).

    ##### last change 2023-09-23 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "Can I export intermediate files?"

    Yes.

    It is possible to export all intermediate files, as well as a file indicating coverage with the flag `--e`.

    In `patient` mode, alignment files can be obtained by using `--align`.

    ##### last change 2023-10-13 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "How do I store data in a relational database?"

    First, export intermediate files using the following command:

    ```bash
    pheno-ranker -r individuals.json -e my_export_data
    ```

    This command will generate a set of intermediate files, and the one you'll need for queries is `my_export_data.ref_binary_hash.json`.

    To convert the JSON data to CSV, you can use various methods, but we recommend using the `jq` tool:

    ```bash
    jq -r 'to_entries[] | [.key, .value.binary_digit_string] | @csv' < my_export_data.ref_binary_hash.json | awk 'BEGIN {print "id,binary_digit_string"}{print}' > output.csv
    ```

    The results are now stored at `output.csv` 

    Finally, store the data in your database as you will usually do.

    ##### last change 2023-10-13 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "How can I exclude a given variable?"

    To exclude a specific variable, you can use one of the following methods:

    1. Utilize the `--include-terms` or `--exclude-terms` options in the command-line interface (CLI).
    2. Implement a regular expression (regex) in the configuration file using the `exclude_properties_regex` parameter.
    3. Assign a weight of zero to the variable in a weights file (indicated by the `--w` flag). This approach offers the most detailed control over variable exclusion.

    ##### last change 2023-12-22 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "How can I create a JSON file consisting of a subset of individuals?"

    You can use the tool `jq`:

    ```bash
    # Let's assume you have an array of "id" values in a variable named ids
    ids=( "157a:week_0_arm_1" "157a:week_2_arm_1" )

    # Use jq to filter the array based on the "id" values
    jq --argjson ids "$(printf '%s\n' "${ids[@]}" | jq -R -s -c 'split("\n")')" 'map(select(.id | IN($ids[])))' < individuals.json > subset.json
    ```

    ##### last change 2024-07-02 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "How does Pheno-Ranker treat empty values?"

    Empty values, as well as `NA` values, are discarded by Pheno-Ranker.

    ##### last change 2024-13-02 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

## Installation
