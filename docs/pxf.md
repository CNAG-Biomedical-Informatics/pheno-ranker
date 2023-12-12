**PXF** stands for **P**henotype e**X**change **F**ormat. Phenopackets v2 [documentation](https://phenopacket-schema.readthedocs.io/en/latest/basics.html).

<figure markdown>
   ![Phenopackets v2](https://www.ga4gh.org/wp-content/uploads/2022/02/phenopachets-v2-final-1.jpeg){ width="500" }
   <figcaption>Figure extracted from www.ga4gh.org</figcaption>
</figure>

Phenopackets organize information using [top-level elements](https://phenopacket-schema.readthedocs.io/en/latest/toplevel.html). Our software, `Convert-Pheno`, specifically processes data from the [Phenopacket element](https://phenopacket-schema.readthedocs.io/en/latest/phenopacket.html), serialized in [PXF](http://phenopackets.org/) format.

??? Tip "Browsing PXF `JSON` data"

    You can browse a public Phenopackets v2 file with onf of the following **JSON viewers**:

    * [JSON Hero](https://jsonhero.io/new?url=https://raw.githubusercontent.com/cnag-biomedical-informatics/convert-pheno/main/t/pxf2bff/in/pxf.json)
    * [Datasette](https://lite.datasette.io/?json=https%3A%2F%2Fraw.githubusercontent.com%2Fcnag-biomedical-informatics%2Fconvert-pheno%2Fmain%2Ft%2Fomop2pxf%2Fout%2Fpxf.json#/data?sql=select+*+from+pxf)

## PXF (Phenopacket top-element) as input ![PXF](https://avatars.githubusercontent.com/u/17553567?s=280&v=4){ width="20" }

When using the `pheno-ranker` command-line interface, simply ensure the [correct syntax](https://github.com/cnag-biomedical-informatics/pheno-ranker#synopsis) is provided.

=== "Cohort mode"

    Basic run:

    ```bash
    pheno-ranker -r pxf.json
    ```

    The default output is named `matrix.txt` and it's a `N x N` bidimensional matrix with a pairwise comparison of all individuals.

=== "Patient mode"

    Basic run:

    ```bash
    pheno-ranker -r pxf.json -t patient.json
    ```

    The output will be printed to `STDOUT` and to a file named `rank.txt`. The matching individuals will be sorted according to their [Hamming distance](https://en.wikipedia.org/wiki/Hamming_distance) to the reference patient. See aditional details in the [Patient Mode](patient.md) page.
