_Patient mode_ aims to determine which **individuals in the cohort** are the **closest to our patient** by ranking them using (dis)similarity metrics.

## Usage

When using the `Pheno-ranker` command-line interface, simply ensure the [correct syntax](https://github.com/cnag-biomedical-informatics/pheno-ranker#synopsis) is provided.

=== "Against one cohort"

    Example:

    ```bash
    pheno-ranker -r individuals.json -t patient.json
    ```
    
    ???+ Question "How do I extract one or many patients from a cohort file?"

        ```bash
        pheno-ranker -r t/individuals.json --patients-of-interest 107:week_0_arm_1 125:week_0_arm_1
        ```

        This command will carry out a dry-run, creating `107:week_0_arm_1.json` and `125:week_0_arm_1.json` files.
        In the example above, I renamed `107:week_0_arm_1.json` to `patient.json` by typing this:
       
        ```bash
        mv 107:week_0_arm_1.json patient.json
        ```

    This will create the text file `rank.txt`.

    --8<-- "tbl/rank-one.md"

=== "Against multiple cohorts"

    The process mirrors handling a single cohort; the sole distinction is the addition of a prefix to each `primary_key`, enabling us to trace the origin of every individual.

    Let's reuse `individuals.json` to have the impression of having more than one cohort.

    Example:

    ```bash
    pheno-ranker -r individuals.json individuals.json individuals.json -t patient.json --max-out 10 -o rank_multiple.txt
    ```

    This will create the text file `rank_multiple.txt`.

    --8<-- "tbl/rank-multiple.md"

    !!! Question "Why the distance for `107:week_0_arm_1` is not `0` if the three cohorts are identical?"

        In _Patient mode_, the global vector is formed using variables solely from the reference cohort(s), not the patient's. The `primary_key` (`id` in this context) is automatically included, leading to a distance of 1 due to the mismatch in the individual's `id` field.

        Note that you can exclude `id` by adding `--exclude-terms id`.

    !!! Abstract "Obtaining additional information on the alignments"

        You can create several files related to the reference --- target alignment by adding `--align`. Example:

        ```bash
        pheno-ranker -r individuals.json individuals.json -t patient.json --align # (optional preffix)
        ```

    Find below an extract of the alignment (`C1_107:week_0_arm_1 --- 107:week_0_arm_1`) extracted from `alignment.txt`:

    ```bash
    REF -- TAR
    1 ----- 1 | (w:  1|d:  0|cd:  0|) diseases.NCIT:C3138.diseaseCode.id.NCIT:C3138 (Inflammatory Bowel Disease)
    1 ----- 1 | (w:  1|d:  0|cd:  0|) ethnicity.id.NCIT:C41261 (Caucasian)
    1 ----- 1 | (w:  1|d:  0|cd:  0|) exposures.NCIT:C154329.exposureCode.id.NCIT:C154329 (Smoking)
    1 ----- 1 | (w:  1|d:  0|cd:  0|) exposures.NCIT:C154329.unit.id.NCIT:C65108 (Never Smoker)
    0       0 | (w:  1|d:  0|cd:  0|) exposures.NCIT:C154329.unit.id.NCIT:C67147 (Current Smoker)
    0       0 | (w:  1|d:  0|cd:  0|) exposures.NCIT:C154329.unit.id.NCIT:C67148 (Former Smoker)
    1 ----- 1 | (w:  1|d:  0|cd:  0|) exposures.NCIT:C2190.exposureCode.id.NCIT:C2190 (Alcohol)
    0       0 | (w:  1|d:  0|cd:  0|) exposures.NCIT:C2190.unit.id.NCIT:C126379 (Non-Drinker)
    0       0 | (w:  1|d:  0|cd:  0|) exposures.NCIT:C2190.unit.id.NCIT:C156821 (Alcohol Consumption More than 2 Drinks per Day for Men and More than 1 Drink per Day for Women)
    1 ----- 1 | (w:  1|d:  0|cd:  0|) exposures.NCIT:C2190.unit.id.NCIT:C17998 (Unknown)
    0       0 | (w:  1|d:  0|cd:  0|) exposures.NCIT:C73993.exposureCode.id.NCIT:C73993 (Pack Year)
    0       0 | (w:  1|d:  0|cd:  0|) exposures.NCIT:C73993.unit.id.NCIT:C73993 (Pack Year)
    1 xxx-- 0 | (w:  1|d:  1|cd:  1|) id.C1_107:week_0_arm_1 (id.C1_107:week_0_arm_1)
    0       0 | (w:  1|d:  0|cd:  1|) id.C1_107:week_14_arm_1 (id.C1_107:week_14_arm_1)
    0       0 | (w:  1|d:  0|cd:  1|) id.C1_107:week_2_arm_1 (id.C1_107:week_2_arm_1)
    0       0 | (w:  1|d:  0|cd:  1|) id.C1_125:week_0_arm_1 (id.C1_125:week_0_arm_1)
    0       0 | (w:  1|d:  0|cd:  1|) id.C1_125:week_14_arm_1 (id.C1_125:week_14_arm_1)
    ...
    ```
