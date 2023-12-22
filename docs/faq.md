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



## Installation
