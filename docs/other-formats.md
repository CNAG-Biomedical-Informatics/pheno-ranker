!!! Hint "About other formats"
    `Pheno-Ranker` leverages the data harmonization of **GA4GH** standards. However, to promote broader adoption, we also support other formats like raw `JSON/YAML` and `CSV`.

=== "YAML / JSON"

    `Pheno-Ranker` _a priori_ accepts as input "any" `JSON` or `YAML` array file. In order to do it, you'll need a **configuration file**. See a tutorial on how to use it [here](tutorial-json-format.md#moviepackets).

    !!! Bug "What do you mean by "any" `JSON` or `YAML`?"
        `Pheno-Ranker` is capable of processing deeply nested data structures but has its limitations. If your data includes arrays nested more than one level deep, it may not be compatible with the tool's capabilities.

=== "CSV"

    We developed an utility that converts **CSV** files to **JSON** and automatically creates the **configuration file** needed. See an example on how to use it [here](csv-import.md). 
