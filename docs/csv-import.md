# How to use a CSV with Pheno-Ranker

=== "Explanation"

    If you have a CSV, you can use `Pheno-Ranker` too :smile: !
    
    !!! Warning "Qualitative (categorical) vs. quantitative values"

        If your dataset contains both quantitative and qualitative variables, consider exploring [Factor Analysis of Mixed Data](https://en.wikipedia.org/wiki/Factor_analysis_of_mixed_data). Alternatively, if your data is purely numeric, you may find [K-means clustering](https://en.wikipedia.org/wiki/K-means_clustering) useful.

        If you plan to use `Pheno-Ranker` and some of your variables contain **quantitative values** (such as integers or floating-point numbers), we recommend **discretizing** them into ranges.
    
    ??? Hint "Best practices for CSV data quality"
    
        Here are a few important considerations regarding the CSV format. Most of these are common-sense guidelines:

        * Ensure there are no duplicated column names (headers).
           
        * While it's acceptable not to include ontologies/terminologies, please maintain consistent nomenclature for values (e.g., avoid using `M` and `Male` to refer to the same concept).
              
        * For columns, you can use any separator of your choice (default is `;`), but if you have nested values in columns, you must specify the delimiter with `--array-separator` (default is `|`).
                 
        * `Pheno-Ranker` was built with speed in mind, but if you have more than 10K rows, be aware that the calculations may take more than a few seconds.

    !!! Warning "About inter-cohort analysis with CSV"
        Please note that performing inter-cohort analysis may be difficult due to potential inconsistencies or lack of common variables across different CSVs.
    
    Ok, let's convert a CSV then.
    
    === "Converting a CSV"
    
        Imagine you have a file named `example.csv` that uses `;` as a column separator, and it looks like this:
        
        | Foo  | Bar         | Baz  |
        | ---  | ----------- | ---- |
        | foo1 | bar1a,bar1b | baz1 |
        | foo2 | bar2a,bar2b | baz2 |
        
        Column `Bar` is an array and columns `Foo`and `Baz` aren't. Your file does not have a column that can be used as an **identifier** for each row.
        
        OK, we are going to use the included [utility](https://raw.githubusercontent.com/CNAG-Biomedical-Informatics/pheno-ranker/main/utils/csv2pheno_ranker/README.md) to convert `example.csv`:
        
        ```bash
        csv2pheno-ranker -i example.csv --generate-primary-key --primary-key-name Id --array-separator ','
        ```
        
        Where:
        
        * `--generate-primary-key` forces the generation of a primary key field for each record in your CSV, if one does not already exist. Use this option when your data lacks a unique identifier. The name of the newly created primary key field should be specified using `--primary-key-name`.

        * `--primary-key-name Id` specifies the name `Id` for the primary key field. This option is used together with `--generate-primary-key` to name the newly generated primary key field, or alone, to identify the existing field to be used as a primary key in your CSV data. The specified field must be a single-value field (non-array).

        * `--array-separator ','` specifies the delimiter for nested values in columns.

        One of the results will be this file named `example.json`:
        
        ```json
        [
           {
              "Bar" : [
                 "bar1a",
                 "bar1b"
              ],
              "Baz" : "baz1",
              "Foo" : "foo1",
              "Id" : "PR_00000001"
           },
           {
              "Bar" : [
                 "bar2a",
                 "bar2b"
              ],
              "Baz" : "baz2",
              "Foo" : "foo2",
              "Id" : "PR_00000002"
           }
        ]
        ```
        
        And the other will be this file named `example_config.yaml`:
        
        ```yaml
        ---
        allowed_terms:
        - Bar
        - Baz
        - Foo
        - Id
        array_terms:
        - Bar
        format: CSV
        id_correspondence:
          CSV:
            - Bar: Bar
        primary_key: Id
        ```
        
        Once you have these two files you can run `Pheno-Ranker` by using:
        
        ```bash
        pheno-ranker -r example.json --config example_config.yaml
        ```

        If you want to exclude or include columns (i.e., terms) you can use the corresponding flag:

        ```bash
        pheno-ranker -r example.json --exclude-terms Id Foo --config example_config.yaml
        ```

        Remember to always use `--config example_config.yaml`.
        
        Good luck!
    
    
=== "Usage"

    --8<-- "https://raw.githubusercontent.com/CNAG-Biomedical-Informatics/pheno-ranker/main/utils/csv2pheno_ranker/README.md"

