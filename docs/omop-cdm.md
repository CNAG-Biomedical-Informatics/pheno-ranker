
# Processing OMOP CDM exports 

<figure markdown>
   ![OMOP CDM](https://www.ohdsi.org/wp-content/uploads/2015/02/h243-ohdsi-logo-with-text.png){ width="400" }
   <figcaption>Image extracted from www.ohdsi.org</figcaption>
</figure>

**OMOP CDM** stands for **O**bservational **M**edical **O**utcomes **P**artnership **C**ommon **D**ata **M**odel. 

You can find a link [here](https://www.ohdsi.org/data-standardization/the-common-data-model) to OMOP CDM documentation.

## Step 1: Install `Convert-Pheno`

We recommend downloading from CPAN.

First, install system-level dependencies:

```bash
sudo apt-get install cpanminus libbz2-dev zlib1g-dev libperl-dev libssl-dev
```

We will install Convert-Pheno and its dependencies at `~/perl5`:

```
cpanm --local-lib=~/perl5 local::lib && eval $(perl -I ~/perl5/lib/perl5/ -Mlocal::lib)
cpanm --notest Convert::Pheno
convert-pheno --help
```

To ensure Perl recognizes your local modules every time you start a new terminal, you should type:

```bash
echo 'eval $(perl -I ~/perl5/lib/perl5/ -Mlocal::lib)' >> ~/.bashrc
```

??? Note "Optional: Installing Athena-OHDSI database"

    If your OMOP CDM data is not self-contained, you might need to download the Athena-OHDSI database.

    The database file is available at this [link](https://drive.google.com/drive/folders/1-5Ywf-hhwb8bX1sRNV2Tf3EjH4TCaC8P?usp=sharing) (~2.2GB). The database may be needed when using `-iomop`.

    See latest download installations [here](https://github.com/CNAG-Biomedical-Informatics/convert-pheno?tab=readme-ov-file#how-to-run-convert-pheno).

    Once downloaded, use the options `--ohdsi-db` and `--path-to-ohdsi-db`

## Step 2: Use `Convert-Pheno` to Convert OMOP CDM to Beacon v2 Models

We'll be using the `convert-pheno` command-line interface to consolidate all rows from a given individual into a single object.

Usage:

```bash
convert-pheno -iomop omop_dump.sql -obff individuals.json
```

If you have to use the Athena-OHDSI database:

```bash
convert-pheno -iomop omop_dump.sql -obff individuals.json --path-to-ohdsi-db ./
```

!!! Hint "Additional options"
    `Convert-Pheno` has more options. Find a more detailed explanation at the [documentation](https://cnag-biomedical-informatics.github.io/convert-pheno/omop-cdm).

## Step 3: Running `Pheno-Ranker`

Now, you can use the standard nomenclature for running jobs.

=== "Cohort mode"

    ```bash
    pheno-ranker -r individuals.json
    ```

=== "Patient mode"

    ```bash
    pheno-ranker -r individuals.json -t target.json
    ```
