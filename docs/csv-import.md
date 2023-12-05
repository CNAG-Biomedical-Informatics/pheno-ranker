# How to use a CSV with Pheno-Ranker

=== "Explanation"

    If you have a CSV, you can use `Pheno-Ranker` too :smile: !
    
    !!! Warning "About inter-cohort analysis with CSV"
        Please note that performing inter-cohort analysis may be difficult due to potential inconsistencies or lack of common variables across different CSVs.
    
    ??? Hint "Notes on CSV quality"
    
        Here are a few important considerations regarding the CSV format. Most of these are common-sense guidelines:
    
        * Ensure there are no duplicated column names (headers).
    
        * While it's acceptable not to include ontologies, please maintain consistent nomenclature for values (e.g., avoid using `M` and `Male` to refer to the same concept).
    
        * You can use any separator of your choice, but if you have nested values, they must be quoted and separated by commas (e.g., `valA, valB, "valC1, valC2", valD`).
    
        * `Pheno-Ranker` was built with speed in mind, but if you have more than 10K rows, be aware that the calculations may take more than a few seconds.
    
        * Qualitative values are preferred over quantitative ones. If you have quantitative values (numbers, and in particular floating ones), we recommend that you re-encode them as ranges. This way, the comparison will make more sense.
    
    Ok, let's convert a CSV then.
    
    === "Converting a CSV"
    
        Imagine you have a file named `example.csv` that looks like this:
        
        | Foo  | Bar         | Baz  |
        | ---  | ----------- | ---- |
        | foo1 | bar1a, bar1b| baz1 |
        | foo2 | bar2a, bar2b| baz2 |
        
        Column `Bar` is an array and columns `Foo`and `Baz` aren't. Your file does not have a column that can be used as an **identifier** for each row.
        
        OK, we are going to use the included [utility](https://raw.githubusercontent.com/CNAG-Biomedical-Informatics/pheno-ranker/main/utils/csv2pheno_ranker/README.md) to convert `example.csv`:
        
        ```bash
        ./csv2pheno-ranker -i example.csv --set-primary-key --primary-key Id
        ```
        
        Where:
        
        * `--set-primary-key` means that we are asking to generate an unique ID (identifier) as a primary key. The label for that new ID will be set with `--primary-key`.
        
        * `--primary-key Id` means that we want `Id` to be the label for the primary key
        
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
        ./pheno-ranker -r example.json --config example_config.yaml
        ```
        
        Remember to always use `--config example_config.yaml`.
        
        Good luck!
    
    
=== "Usage"

    --8<-- "https://raw.githubusercontent.com/CNAG-Biomedical-Informatics/pheno-ranker/main/utils/csv2pheno_ranker/README.md"

