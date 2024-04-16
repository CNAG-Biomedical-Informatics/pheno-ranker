Frequently Asked Questions

## General

??? faq "What does `Pheno-Ranker` do?"

    `Pheno-Ranker` is an open-source toolkit developed for the semantic similarity analysis of phenotypic and clinical data. It natively supports GA4GH standards, such as [Phenopackets v2](pxf.md) and [Beacon v2](bff.md), using as input their JSON/YAML data exchange formats. Beyond these specific standards, Pheno-Ranker is designed to be highly versatile, capable of handling any data serialized into `JSON`, `YAML`, and `CSV` formats, extending its utility beyond the health data domain. Pheno-Ranker transforms hierarchical data into binary digit strings, enabling efficient similarity matching both within cohorts and between individual patients and reference cohorts. 

    ##### last change 2024-29-24 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "Is `Pheno-Ranker` free?"

    Yes. See the [license](https://github.com/mrueda/pheno-ranker/blob/main/LICENSE).

    ##### last change 2023-09-23 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "Where can I find the Web App user interface?"

    You can find the Web App user interface at this address: [https://pheno-ranker.cnag.eu](https://pheno-ranker.cnag.eu).

    There is a playground that you can use by entering the following credentials:

    **Username:** `pheno`  
    **Password:** `ranker`

    ##### last change 2024-04-01 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "Can I export term coverage and intermediate files?"

    Yes. It is possible to export a file indicating **coverage** for each term (i.e., 1D-keys) as well as all **intermediate files** using the flag `--e`.

    On top of that, in _patient mode_, alignment files can be obtained by using `--align`.

    ##### last change 2023-10-13 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "How can I exclude a given variable?"

    To exclude a specific variable, you can use one of the following methods:

    1. Utilize the `--include-terms` or `--exclude-terms` options in the command-line interface (CLI).
    2. Implement a regular expression (regex) in the configuration file using the `exclude_properties_regex` parameter.
    3. Assign a weight of zero to the variable in a weights file (indicated by the `--w` flag). This approach offers the most detailed control over variable exclusion.

    ##### last change 2023-12-22 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "How does `Pheno-Ranker` treat empty and missing values?"

    `Pheno-Ranker` uses categorical variables to define the [binary_digit_vector](algorithm.md). Any key that contains an empty value such as `null`, `{}`, or `[]` is discarded. We also deliberately discard keys with missing values (namely `NA` and `NaN`). On the other hand, any other string such as `Unknown` or `No` is accepted as values and will be incorporated as a category. Thus, if you want missing values to be included as a category, we recommend replacing them with another string (e.g., `Unknown`).

    Now, in the context of one-hot encoded data, missing values are typically represented by zeros, and that's exactly `Pheno-Ranker`'s approach.

    Let's consider the following example:

    ```json
    [
      {
        "id": "PR_1",
        "Name": "Foo"
      },
      {
        "id": "PR_2",
        "Name": "Bar"
      },
      { 
        "id": "PR_3"
      },
      {
        "id": "PR_4",
        "Name": null
      },
      {
        "id": "PR_5",
        "Name": "NA"
      }
    ]
    ```

    We have only one variable (i.e., category) named `Name`. The first two individuals contain valid values, the third does not contain the key, the fourth has it as `null`, and the fifth has `NA`.

    The coverage (see "Can I export term coverage and intermediate files?" above) for the terms will be the following:

    ```json
    {
       "cohort_size" : 5,
       "coverage_terms" : {
          "Name" : 2,
          "id" : 5
       }
    }
    ```

    In which we see that the variable `Name` only has coverage for 2 out of 5 individuals.

    If we run a job with the default metric (Hamming distance) and `--include-terms Name`, the global hash will look like this:
    ```json
    {
       "Name.Bar" : 1,
       "Name.Foo" : 1
    }
    ```

    The binary-digit-vector will look like this:

    ```json
    {
      "PR_1": "01",
      "PR_2": "10",
      "PR_3": "00",
      "PR_4": "00",
      "PR_5": "00"
    }

    ```

    The resulting `matrix.txt` will look like this:

    |       | PR_1 | PR_2 | PR_3 | PR_4 | PR_5 |
    |-------|------|------|------|------|------|
    | PR_1  |  0   |  2   |  1   |  1   |  1   |
    | PR_2  |  2   |  0   |  1   |  1   |  1   |
    | PR_3  |  1   |  1   |  0   |  0   |  0   |
    | PR_4  |  1   |  1   |  0   |  0   |  0   |
    | PR_5  |  1   |  1   |  0   |  0   |  0   |

    In this context, the distance from `PR_1` to `PR_2` is `2` (indicating they differ in two positions), while the distance from `PR_1` to `PR_3`, `PR_4`, and `PR_5` is only `1`. This discrepancy arises because an empty value contributes less to the distance calculation than a non-empty one. While this discrepancy may often be acceptable since the data will still fall into different clusters, an alternative solution to mitigate this issue is to exclude the variable `Name` entirely when running `Pheno-Ranker`. Another, less drastic approach is to employ the Jaccard metric (`--similarity-metric-cohort jaccard`), which is less sensitive to empty values. With the Jaccard index, the resulting matrix will be as follows:


    |       | PR_1 | PR_2 | PR_3 | PR_4 | PR_5 |
    |-------|------|------|------|------|------|
    | PR_1  |  1   | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
    | PR_2  | 0.000000 |  1   | 0.000000 | 0.000000 | 0.000000 |
    | PR_3  | 0.000000 | 0.000000 |  1   | 0.000000 | 0.000000 |
    | PR_4  | 0.000000 | 0.000000 | 0.000000 |  1   | 0.000000 |
    | PR_5  | 0.000000 | 0.000000 | 0.000000 | 0.000000 |  1   |

    When handling missing values within the context of Pheno-Ranker, it's essential to consider the specific characteristics of your dataset, the nature of missingness, and the potential impact on downstream analyses

    ##### last change 2024-08-04 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

### Pre-processing

??? faq "How can I create a JSON file consisting of a subset of individuals?"

    You can use the tool `jq`:

    ```bash
    # Let's assume you have an array of "id" values in a variable named ids
    ids=( "157a:week_0_arm_1" "157a:week_2_arm_1" )

    # Use jq to filter the array based on the "id" values
    jq --argjson ids "$(printf '%s\n' "${ids[@]}" | jq -R -s -c 'split("\n")')" 'map(select(.id | IN($ids[])))' < individuals.json > subset.json

    ```

    ##### last change 2024-07-02 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

??? faq "I am using PXF and I would like to include a property with deeply nested arrays such as `interpretations.diagnosis.genomicInterpretations`. What do you suggest?"

    The approach here is to transition from **array** properties to **objects**. By default, `Pheno-Ranker` handles this transition up to 1D. However, for more intricate scenarios, we recommend some preprocessing steps.

    The property [genomicInterpretation](https://phenopacket-schema.readthedocs.io/en/latest/genomic-interpretation.html) presents some peculiarities for several reasons. It can have multiple nested levels or arrays, and each element requires the `"id"` property (`subject_or_biosample_id`). This implies that users might be interested in the variants, but since `subject_or_biosample_id` will be in the flattened key, it will never match another patient. To address this, we'll transform our `PXF` data using `Python`:

    Imagine you have an JSON file named `data.json`, like this one:
    ```json
    {
      "foo": "bar",
      "interpretations": [
        {
          "id": "SUBJECT_1",
          "progressStatus": "SOLVED",
          "diagnosis": {
            "disease": {
              "id": "OMIM:000001",
              "label": "OMIM CONDITION"
            },
            "genomicInterpretations": [
              {
                "subjectOrBiosampleId": "SUBJECT_1",
                "interpretationStatus": "CAUSATIVE",
                "gene": {
                  "valueId": "GENE1",
                  "symbol": "*000001"
                }
              },
              {
                "subjectOrBiosampleId": "SUBJECT_1",
                "interpretationStatus": "CAUSATIVE",
                "gene": {
                  "valueId": "GENE2",
                  "symbol": "*000002"
                }
              }
            ]
          }
        }
      ],
    }
    ```
    
    We'll process it with Python:

    ```python
    import json
    
    # Function to transform data from a file
    def transform_interpretations_from_file(file_path):
        with open(file_path, 'r') as file:
            data = json.load(file)
    
        # Initialize a result dictionary preserving other root-level keys
        transformed_data = {key: value for key, value in data.items() if key != "interpretations"}
        transformed_data["interpretations"] = {}
    
        # Extract and process interpretations if they exist
        if "interpretations" in data:
            interpretations = data["interpretations"]
            for interpretation in interpretations:
                disease_id = interpretation["diagnosis"]["disease"]["id"]
                # Create a dictionary for each interpretation, omitting "id" and transforming "diagnosis"
                transformed_interpretation = {key: value for key, value in interpretation.items() if key != "diagnosis" and key != "id"}
                transformed_interpretation['genomicInterpretations'] = {}
    
                # Process each genomic interpretation, omitting "subjectOrBiosampleId"
                for genomic in interpretation["diagnosis"]["genomicInterpretations"]:
                    gene_id = genomic["gene"]["valueId"]
                    filtered_genomic = {k: v for k, v in genomic.items() if k != "subjectOrBiosampleId"}
                    transformed_interpretation['genomicInterpretations'][gene_id] = filtered_genomic
    
                # Assign the transformed interpretation to the corresponding disease_id
                transformed_data["interpretations"][disease_id] = transformed_interpretation
    
        return transformed_data
    
    # File path to JSON data
    file_path = 'data.json'
    
    # Call the function with the file path
    transformed_output = transform_interpretations_from_file(file_path)
    
    # Print the transformed data
    print(json.dumps(transformed_output, indent=2))
    ```

    The final JSON will look like this:
    ```json
    {
      "foo": "bar",
      "interpretations": {
        "OMIM:000001": {
          "progressStatus": "SOLVED",
          "genomicInterpretations": {
            "GENE1": {
              "interpretationStatus": "CAUSATIVE",
              "gene": {
                "valueId": "GENE1",
                "symbol": "*000001"
              }
            },
            "GENE2": {
              "interpretationStatus": "CAUSATIVE",
              "gene": {
                "valueId": "GENE2",
                "symbol": "*000002"
              }
            }
          }
        }
      }
    }
    ```

    Now you can run `Pheno-Ranker` as usual. The flattened keys will look like this:
    ```json
    "interpretations.OMIM:000001.genomicInterpretations.GENE1.gene.symbol.*000001" : 1,
    "interpretations.OMIM:000001.genomicInterpretations.GENE1.interpretationStatus.CAUSATIVE" : 1,
    "interpretations.OMIM:000001.genomicInterpretations.GENE2.gene.symbol.*000002" : 1,
    "interpretations.OMIM:000001.genomicInterpretations.GENE2.interpretationStatus.CAUSATIVE" : 1,
    "interpretations.OMIM:000001.progressStatus.SOLVED" : 1
    ```
    ##### last change 2024-14-04 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

### Post-processing

??? faq "How do I store `Pheno-Ranker`'s data in a relational database?"

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

??? faq "Can I Perform MDS with Jaccard Indices?"
    Yes, you can perform Multidimensional Scaling (MDS) using a matrix of Jaccard indicess. To use MDS, which typically requires dissimilarity data, you'll need to convert your Jaccard similarity matrix into a dissimilarity matrix. This is done by subtracting the Jaccard similarity scores from 1, where the formula is `Dissimilarity = 1 - Similarity`. This conversion ensures that higher similarities translate into shorter distances for MDS, facilitating accurate low-dimensional representations of the data.

    Example `R` code:

    ```R
    # Load the matrix of Jaccard similarities from a text file
    data <- as.matrix(read.table("matrix.txt", header = TRUE, row.names = 1))
    
    # Convert Jaccard similarity matrix to a dissimilarity (distance) matrix
    dissimilarity_matrix <- 1 - data
    
    # Perform classical Multidimensional Scaling (MDS) using the dissimilarity matrix
    # 'eig=TRUE' allows the function to return eigenvalues
    # 'k=2' sets the number of dimensions for the MDS output
    fit <- cmdscale(dissimilarity_matrix, eig=TRUE, k=2)
    
    # Additional analysis and plotting code here
    ...
    ```

    ##### last change 2024-04-15 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)



## Installation

??? faq "From where can I download the software?"

    Should you opt for the **command-line interface**, we suggest obtaining the software from the [CPAN distribution](https://cnag-biomedical-informatics.github.io/pheno-ranker/usage/#from-cpan), which additionally includes the utility [bff-pxf-simulator](https://cnag-biomedical-informatics.github.io/pheno-ranker/bff-pxf-simulator).

    ##### last change 2024-29-03 by Manuel Rueda [:fontawesome-brands-github:](https://github.com/mrueda)

