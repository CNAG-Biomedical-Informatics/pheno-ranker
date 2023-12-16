# Processing VCF files

In this page, we aim to explore the full potential of `Pheno-Ranker`. Our focus will be on processing a [VCF](https://en.wikipedia.org/wiki/Variant_Call_Format) file - a challenging yet intriguing task.

??? Tip "A VCF is essentially a specialized form of a TSV"

    The Variant Call Format (VCF) is a bioinformatics standard created for the 1000 Genomes Project to store gene variations, evolving to version 4.3 and expanded with formats like gVCF for comprehensive data representation.
 
    The body of the Variant Call Format (VCF), which is essentially a **tab-separated values (TSV) file**, comprises eight mandatory columns and an unlimited number of optional columns for additional sample information. The first optional column specifies the data format for the subsequent columns.

## Steps

OK, so our goal is to compare samples within the VCF based on their genomic variants. To achieve this, we'll undertake the following steps:

1. Transpose the VCF data into a TSV format, arranging it so that each row contains all variants for a specific sample.
2. Transform the TSV into a format that is compatible with `Pheno-Ranker`, utilizing the provided [utility](csv-import.md).
3. Execute `Pheno-Ranker` in _cohort-mode_ to generate plots using R.
4. Run `Pheno-Ranker` in _patient-mode_ to identify the most similar sample.
5. Generate QR codes for the first 10 samples (and decode them back).

??? Question "Where does your `VCF` data come from?"

    It's a subset from 1000G. It's explained [here](https://github.com/mrueda/beacon2-ri-tools/tree/main/test).

Let's go!

### Step1: Tranpose the VCF to TSV

We are going to be using the included [Python script](https://github.com/CNAG-Biomedical-Informatics/pheno-ranker/blob/main/utils/csv2pheno_ranker/vcf/vcf2pheno-ranker.py)

```bash
utils/csv2pheno_ranker/vcf/vcf2pheno-ranker.py -i test_1000G.vcf.gz -o output.tsv
```

Note that you have to use the right paths for your executables.

### Step 2: Transform the TSV to a compatible format

```bash
utils/csv2pheno_ranker/csv2pheno-ranker -i output.tsv -primary-key 'Sample ID'
```

Where the created `output.json` has the follwoing format format:

```json
[
  {
      "1_99490_C_T" : "0|0",
      "1_99671_A_T" : "0|0",
      ...
      "1_99687_C_T" : "0|0",
      "1_99719_C_T" : "0|0",
      "Sample ID" : "HG00096"
  },
  ...
]


```

### Step 3: Execute `Pheno-Ranker` in _cohort-mode_

```bash
bin/pheno-ranker -r output.json -config output_config.yaml
```

This created the file `matrix.txt`. It's a huge matrix of 2504 x 2504 pairwise-comparisons.

=== "Heatmap and clustering"

    Now you can create a heatmap + clustering with the included script:
    
    ```bash
    Rscript share/r/heatmap.R
    ```
    
    (Running time < 2 min in Apple M2)
    
    <figure markdown>
     ![Heatmap](img/vcf-heatmap.png){ width="600" }
     <figcaption> Intra-cohort pairwise comparison</figcaption>
    </figure>


=== "Dimensionality reduction"

    Or reduce the dimensionality:
    
    ```bash
    Rscript share/r/mds.R
    ```
    
    (Running time < 2 min in Apple M2)
    
    <figure markdown>
     ![MDS](img/vcf-mds.png){ width="600" }
     <figcaption> Intra-cohort pairwise comparison</figcaption>
    </figure>

### Step 4: Execute `Pheno-Ranker` in _patient-mode_

First we are going to start one sample. The first one in the VCF: `HG00096`

```bash
bin/pheno-ranker -r output.json -config output_config.yaml --patients-of-interest HG00096
```

This creates `HG00096.json`.

Now we run `Pheno-Ranker` in _patient-mode_:

```bash
bin/pheno-ranker -r output.json -t HG00096.json -config output_config.yaml 
```

??? Abstract "See results"
    |RANK | REFERENCE(ID) | TARGET(ID) | FORMAT | LENGTH | WEIGHTED | HAMMING-DISTANCE | DISTANCE-Z-SCORE | DISTANCE-P-VALUE | DISTANCE-Z-SCORE(RAND) | JACCARD-INDEX | JACCARD-Z-SCORE | JACCARD-P-VALUE|
    |- |    -    |    -    | -   |    -   |  -    |    - |    -    |      -       |      -   |    -    |    -    |     -    |
    |1 | HG00096 | HG00096 | CSV |   1043 | False |    0 |  -3.440 |    0.0002913 | -32.2955 |   1.000 |   3.549 |    0.0053956|
    |2 | HG01537 | HG00096 | CSV |   1050 | False |   14 |  -2.712 |    0.0033449 | -31.5396 |   0.987 |   2.778 |    0.0377136|
    |3 | HG03598 | HG00096 | CSV |   1054 | False |   22 |  -2.296 |    0.0108361 | -31.1101 |   0.979 |   2.342 |    0.0898655|
    |4 | HG04141 | HG00096 | CSV |   1055 | False |   24 |  -2.192 |    0.0141860 | -31.0030 |   0.977 |   2.233 |    0.1087819|
    |5 | HG04033 | HG00096 | CSV |   1055 | False |   24 |  -2.192 |    0.0141860 | -31.0030 |   0.977 |   2.233 |    0.1087819|
    |6 | HG00237 | HG00096 | CSV |   1056 | False |   26 |  -2.088 |    0.0183923 | -30.8960 |   0.975 |   2.125 |    0.1303610|
    |7 | NA12827 | HG00096 | CSV |   1057 | False |   28 |  -1.984 |    0.0236175 | -30.7891 |   0.974 |   2.017 |    0.1546849|
    |8 | NA21116 | HG00096 | CSV |   1057 | False |   28 |  -1.984 |    0.0236175 | -30.7891 |   0.974 |   2.017 |    0.1546849|
    |9 | NA20534 | HG00096 | CSV |   1057 | False |   28 |  -1.984 |    0.0236175 | -30.7891 |   0.974 |   2.017 |    0.1546849|
    |10 | HG00234 | HG00096 | CSV |   1057 | False |   28 |  -1.984 |    0.0236175 | -30.7891 |   0.974 |   2.017 |    0.1546849|

Patient `HG01537` is the closest. It has a distance of 14 to `HG00096` and a _p_-value = 0.0033449.

### Step 5: Generate QR codes for the first 10 samples

We are going to compress all variant information (1042 variants) into QR-codes

1. First we are going to export the needed files:

```bash
bin/pheno-ranker -r output.json -config output_config.yaml --export
```

2. Now we use the included utility `pheno-ranker2barcode`:

```bash
utils/barcode/pheno-ranker2barcode -i export.ref_binary_hash.json
```
This has created QR codes (`PNG`) for each sample inside the directory `qr_codes`.

??? Example "See QR codes for the first 10 samples"
    <figure markdown>
     ![QR](img/vcf-qr.png){ width="600" }
     <figcaption> Qr codes for 10 samples</figcaption>
    </figure>

To decode the QR codes back to `Pheno-Ranker` format:

```bash
utils/barcode/barcode2pheno-ranker -i $(ls -1 qr_codes/*png | head -10) -t export.glob_hash.json 

```
This will create the file `decoded.json`

Enjoy!

:smile:

