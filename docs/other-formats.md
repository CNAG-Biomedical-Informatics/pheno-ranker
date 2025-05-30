!!! Hint "About other formats"
    `Pheno-Ranker` leverages the data harmonization provided by **GA4GH** standards. However, to promote broader adoption, we also support other formats like raw `JSON/YAML` and `CSV`.

=== "YAML / JSON"

    `Pheno-Ranker` _a priori_ accepts as input "any" `JSON` or `YAML` array file. In order to do it, you'll need a **configuration file**. See a tutorial on how to use it [here](generic-json.md#moviepackets).

    !!! Bug "What do you mean by "any" `JSON` or `YAML`?"
        `Pheno-Ranker` is capable of processing deeply nested data structures but has its limitations. If your data includes arrays nested more than one level deep, we recommend you that you tranform the 2D (or more) nested array elements into 1D objects.

=== "CSV"

    We developed an utility that converts `CSV` files to `JSON` and automatically creates the **configuration file** needed. See an example on how to use it [here](csv-import.md). 
