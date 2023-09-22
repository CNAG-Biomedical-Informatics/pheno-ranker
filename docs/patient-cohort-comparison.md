=== "Command-line"

    When using the `pheno-ranker` command-line interface, simply ensure the [correct syntax](https://github.com/cnag-biomedical-informatics/pheno-ranker#synopsis) is provided.

    ```
    pheno-ranker -r individuals.json -t patient.json
    ```

=== "Module"

    The concept is to pass the necessary information as a hash (in Perl) or dictionary (in Python).

    === "Perl"

        ```Perl
        $data = {
            reference_file => ['./individuals.json'],
            patient_file => 'patient.json',
            out => 'my_basename'
        };
        ```

    === "Python"

        ```Python
        data = {
             "reference_files" : ["./individuals.json"],
             "patient_file" : "patient.json",
             "export" : "my_basename"
        }
        ```

    This way we will create a set of
