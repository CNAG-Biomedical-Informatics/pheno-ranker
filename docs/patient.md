# Patient Mode

_Patient mode_ ranks records in a reference cohort against a target patient or object. It uses the same flattened variables and binary-vector representation as cohort mode, but the output is a ranked table instead of an all-vs-all matrix.

Use patient mode when you want to find the closest matches to a patient profile, inspect which variables overlap, or assess match significance with Z-scores and p-values.

## What You Get

- `rank.txt`: ranked matches between the target and the reference cohort.
- `alignment*`: optional variable-level alignment files when `--align` is used.
- `export.*.json`: optional intermediate hashes, vectors, and coverage statistics when `--export` is used.
- Hamming distance, Jaccard similarity, Z-scores, p-values, and overlap statistics for each match.

[See common usage](usage.md){ .md-button .md-button--primary }
[Compare cohorts](cohort.md){ .md-button }
[Check installation](download-and-installation.md){ .md-button }

## Usage

The examples below show the common patient-mode command-line patterns. For the complete CLI reference, see [Usage](usage.md).

=== "Against one cohort"

    Example:

    ```bash
    pheno-ranker -r individuals.json -t patient.json
    ```
    
    ??? Question "How do I extract one or many patients from a cohort file?"

        ```bash
        pheno-ranker -r t/data/individuals.json --patients-of-interest 107:week_0_arm_1 125:week_0_arm_1
        ```

        This command will carry out a dry-run, creating `107:week_0_arm_1.json` and `125:week_0_arm_1.json` files.
        In the example above, I renamed `107:week_0_arm_1.json` to `patient.json` by typing this:
       
        ```bash
        mv 107:week_0_arm_1.json patient.json
        ```

    This will create the **output** text file `rank.txt`.

    The first rows in `rank.txt` are the best matches according to the selected sorting metric. By default, patient mode sorts by Hamming distance; use `--sort-by jaccard` to sort by Jaccard similarity instead.

    ???+ Abstract "How to read `rank.txt`"

        For most analyses, start with these columns:

        * `RANK`: Match order; `1` is the best match under the selected sorting metric.
        * `REFERENCE(ID)`: The matched individual in the reference cohort.
        * `HAMMING-DISTANCE`: Lower values indicate more similar binary profiles.
        * `JACCARD-INDEX`: Higher values indicate more similar binary profiles.
        * `DISTANCE-P-VALUE` / `JACCARD-P-VALUE`: Significance of the match within the distribution of comparisons in the run.
        * `INTERSECT-RATE(%)`: How much of the target profile is covered by the reference match.
        * `COMPLETENESS(%)`: How much of the reference profile is covered by the target.

        Use Hamming distance when you want a distance-like ranking. Use Jaccard similarity when sparse overlap or missingness is important.

    ??? Abstract "Full `rank.txt` column reference"

        ### Identifiers and run metadata

        * `RANK`: Match order. A rank of `1` is the best match.
        * `REFERENCE(ID)`: The unique identifier (`primary_key`) for the reference individual.
        * `TARGET(ID)`: The unique identifier (`primary_key`) for the target individual passed with `--target`.
        * `FORMAT`: Input format used by the configuration, such as `BFF`, `PXF`, or `CSV`.
        * `WEIGHTED`: Whether the calculation used variable weights with `--weights`.

        ### Alignment size

        * `LENGTH`: Count of variables that have a `1` in either the reference or the target. In other words, this is the size of the comparison space for that pair.

        ??? Example "`LENGTH` example"

            ```bash
            REF: 0001001
            TAR: 1000001
            ```

            In this case, `LENGTH` is `3` because three positions have a `1` in at least one vector.

        ### Similarity and distance metrics

        * `HAMMING-DISTANCE`: Count of positions where the reference and target binary vectors differ. Lower values indicate more similar profiles.
        * `JACCARD-INDEX`: Similarity between the reference and target vectors, calculated as the intersection divided by the union. Higher values indicate more similar profiles.

        ??? Tip "Metric definitions"

            Hamming distance counts mismatches between two binary strings of equal length.

            Jaccard similarity focuses on shared `1` values:

            $$
            \text{Jaccard} = \frac{\text{Intersection}}{\text{Union}}
            $$

        ### Significance statistics

        * `DISTANCE-Z-SCORE`: Empirical Z-score for the observed Hamming distance compared with all target-reference comparisons in the run.
        * `DISTANCE-P-VALUE`: Statistical significance associated with `DISTANCE-Z-SCORE`.
        * `DISTANCE-Z-SCORE(RAND)`: Estimated Z-score for two random binary vectors, assuming the alignment size is equal to `LENGTH`.
        * `JACCARD-Z-SCORE`: Empirical Z-score for the observed Jaccard index compared with all target-reference comparisons in the run.
        * `JACCARD-P-VALUE`: Statistical significance associated with `JACCARD-Z-SCORE`.

        ??? Tip "`DISTANCE-Z-SCORE(RAND)` calculation"

            This value comes from the estimated mean and standard deviation of the Hamming distance for binary strings. It assumes that each position has a 50% chance of being a mismatch, independently of other positions.

            The expected mean is:

            $$
            \text{Estimated Average} = \text{Length} \times \text{Probability of Mismatch}
            $$

            where the probability of mismatch is set to `0.5`.

            The standard deviation is:

            $$
            \text{Estimated Standard Deviation} = \sqrt{\text{Length} \times \text{Probability of Mismatch} \times (1 - \text{Probability of Mismatch})}
            $$

            Finally, the formula for the `Z-score` is:

            $$ Z = \frac{(X - \mu)}{\sigma} $$

            where \( X \) is the observed value, \( \mu \) is the estimated mean, and \( \sigma \) is the estimated standard deviation.

        ### Variable overlap

        * `REFERENCE-VARS`: Total number of variables present in the reference.
        * `TARGET-VARS`: Total number of variables present in the target.
        * `INTERSECT`: Number of variables shared by the reference and target.
        * `INTERSECT-RATE(%)`: Percentage of target variables also present in the reference.
        * `COMPLETENESS(%)`: Percentage of reference variables also present in the target.

        ??? Tip "`INTERSECT-RATE(%)` calculation"

            `INTERSECT-RATE(%)` measures how much of the target profile is covered by the reference:

            $$
            \text{INTERSECT-RATE(\%)} = \frac{\text{Intersection Count}}{\text{Number of Variables in Target}} \times 100
            $$

        ??? Tip "`COMPLETENESS(%)` calculation"

            `COMPLETENESS(%)` measures how much of the reference profile is covered by the target:

            $$
            \text{COMPLETENESS(\%)} = \frac{\text{Intersection Count}}{\text{Number of Variables in Reference}} \times 100
            $$
         
    ??? Example "See results from `rank.txt`"

        --8<-- "tbl/rank-one.md"

=== "Against multiple cohorts"

    The process mirrors handling a single cohort; the main difference is that each reference cohort gets a prefix in its `primary_key`, making it possible to trace the origin of every individual.

    We reuse `individuals.json` to simulate more than one cohort.

    Example:

    ```bash
    pheno-ranker -r individuals.json individuals.json individuals.json -t patient.json --max-out 10 -o rank_multiple.txt
    ```

    This will create the text file `rank_multiple.txt`.

    ??? Example "See results from `rank_multiple.txt`"

        --8<-- "tbl/rank-multiple.md"

    ??? Question "Why the distance for `107:week_0_arm_1` is not `0` if the three cohorts are identical?"

        In _Patient mode_, the global vector is formed using variables solely from the reference cohort(s), not the patient's. The `primary_key` (`id` in this context) is automatically included, leading to a distance of 1 due to the mismatch in the individual's `id` field.

        If you want to visualize the differences in **all variables** (i.e., the union of _reference(s)_ and _target_), simply add the _target_ as another cohort in `--r`. This way, the variables from the patient will be included in the reference vector.

        Note that you can exclude `id` by adding `--exclude-terms id`.

???+ Abstract "Obtaining additional information on the alignments"

     You can create several files related to the reference-target alignment by adding `--align`. By default, this creates `alignment*` files in the current directory, but you can specify a `</path/basename>`. Example:

     ```bash
     pheno-ranker -r individuals.json individuals.json -t patient.json --align
     ```

     Or using a path + basename:
    
     ```bash
     pheno-ranker -r individuals.json individuals.json -t patient.json --align /my/fav/dir/jobid-001-align
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
