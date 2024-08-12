**PXF** stands for **P**henotype e**X**change **F**ormat. Phenopackets v2 [documentation](https://phenopacket-schema.readthedocs.io/en/latest/basics.html).

<figure markdown>
   ![Phenopackets v2](https://www.ga4gh.org/wp-content/uploads/2022/02/phenopachets-v2-final-1.jpeg){ width="500" }
   <figcaption>Figure extracted from www.ga4gh.org</figcaption>
</figure>

Phenopackets organize information using [top-level elements](https://phenopacket-schema.readthedocs.io/en/latest/toplevel.html). Our software, `Pheno-Ranker`, specifically processes data from the [Phenopacket element](https://phenopacket-schema.readthedocs.io/en/latest/phenopacket.html), serialized in [PXF](http://phenopackets.org/) format.

??? Tip "Browsing PXF `JSON` data"

    You can browse a public Phenopackets v2 file with onf of the following **JSON viewers**:

    * [JSON Hero](https://jsonhero.io/new?url=https://raw.githubusercontent.com/cnag-biomedical-informatics/convert-pheno/main/t/pxf2bff/in/pxf.json)
    * [Datasette](https://lite.datasette.io/?json=https%3A%2F%2Fraw.githubusercontent.com%2Fcnag-biomedical-informatics%2Fconvert-pheno%2Fmain%2Ft%2Fomop2pxf%2Fout%2Fpxf.json#/data?sql=select+*+from+pxf)

## PXF (Phenopacket top-element) as input ![PXF](https://avatars.githubusercontent.com/u/17553567?s=280&v=4){ width="20" }

When using the `pheno-ranker` command-line interface, simply ensure the [correct syntax](https://github.com/cnag-biomedical-informatics/pheno-ranker#synopsis) is provided.

??? Question "What happens with deeply nested arrays such as `interpretations.diagnosis.genomicInterpretations`?"

    The property [genomicInterpretation](https://phenopacket-schema.readthedocs.io/en/latest/genomic-interpretation.html) presents some peculiarities for several reasons. It can have multiple nested levels or arrays, the key `"id"` may refer to a given patient, plus the key `subjectOrBiosampleId` referes to the same patient too!. This implies that users might be interested in the variants, but since patient ids will be in the flattened key, it will never match another patient.

    `Pheno-Ranker` will handle this for you for the term `interpretations`. The approach taken is to transition from **array** properties to **objects**.


    Imagine you have a `PXF` data that looks like this:
    ```json
    {
       "id": "Sample_1",
       "interpretations": [
         {
           "id": "Interpretation_1",
           "progressStatus": "SOLVED",
           "diagnosis": {
             "disease": {
               "id": "OMIM:148600",
               "label": "Disease 1"
             },
             "genomicInterpretations": [
               {
                 "subjectOrBiosampleId": "Subject_1",
                 "interpretationStatus": "CAUSATIVE",
                 "variantInterpretation": {
                   "variationDescriptor": {
                     "geneContext": {
                       "valueId": "HGNC:25662",
                       "symbol": "AAGAB"
                     }
                   }
                 }
               }
             ]
           }
         }
       ],
       "subject": {
         "id": "Subject_1"
       }
    }
    ```
    
    The processed `JSON` will look like this:
    ```json
    {
        "id": "Sample_1",
        "interpretations": {
            "OMIM:148600": {
                "genomicInterpretations": {
                    "HGNC:25662": {
                        "interpretationStatus": "CAUSATIVE",
                        "variantInterpretation": {
                            "variationDescriptor": {
                                "geneContext": {
                                    "symbol": "AAGAB",
                                    "valueId": "HGNC:25662"
                                }
                            }
                        }
                    }
                },
                "progressStatus": "SOLVED"
            }
        },
        "subject": {
            "id": "Subject_1"
        }
    }
    ```

    Now you can run `Pheno-Ranker` as usual. The flattened keys will look like this:
    ```json
    "interpretations.OMIM:148600.genomicInterpretations.HGNC:25662.interpretationStatus.CAUSATIVE" : 1,
    "interpretations.OMIM:148600.genomicInterpretations.HGNC:25662.variantInterpretation.variationDescriptor.geneContext.symbol.AAGAB" : 1,
    "interpretations.OMIM:148600.progressStatus.SOLVED" : 1,
    ```

    ??? Warning "Other examples of `PXF` nested array properties"

        Find below another examples of deeply nested properties. For these you have to pre-process your data:

        ```json
        "biosamples.diagnosticMarkers",
        "biosamples.pathologicalTnmFinding",
        "biosamples.phenotypicFeatures",
        "diseases.clinicalTnmFinding",
        "diseases.diseaseStage",
        "measurements.complexValue.typedQuantities",
        "medicalActions.treatment.doseIntervals"
        ```

=== "Cohort mode"

    ### Basic run:

    ```bash
    pheno-ranker -r pxf.json
    ```

    The default **output** is named `matrix.txt` and it's a `N x N` bidimensional matrix with a pairwise comparison of all individuals.

    ### Test dataset

    We are going to use data from the [phenopacket-store](https://github.com/monarch-initiative/phenopacket-store) repository:

    ```bash
    wget https://github.com/monarch-initiative/phenopacket-store/releases/latest/download/all_phenopackets.zip
    unzip all_phenopackets.zip
    ```

    Instead of using the > 5K examples, we will work with a subset of 50, consolidated in an `array`:

    ```bash
    # sudo apt install jq 
    jq -s '.' $(ls -1 */*json | shuf -n 50) > combined.json
    ```

    And now we perform the calculation:

    ```bash
    pheno-ranker -r combined.json -include-terms interpretations
    ```

    For more information visit the [cohort mode](cohort.md) page.

=== "Patient mode"

    ### Basic run:

    ```bash
    pheno-ranker -r pxf.json -t patient.json
    ```

    The **output** will be printed to `STDOUT` and to a file named `rank.txt`. The matching individuals will be sorted according to their [Hamming distance](https://en.wikipedia.org/wiki/Hamming_distance) to the reference patient. See aditional details in the [Patient Mode](patient.md) page.

    For more information visit the [patient mode](patient.md) page.


