!!! Hint "About other formats"
    `Pheno-Ranker` leverages the data harmonization provided by **GA4GH** standards. However, to promote broader adoption, we also support other formats like raw `JSON/YAML` and `CSV`.

=== "YAML / JSON"

    `Pheno-Ranker` _a priori_ accepts as input "any" `JSON` or `YAML` array file. In order to do it, you'll need a **configuration file**. See a tutorial on how to use it [here](generic-json.md#moviepackets).

    !!! Note "What do you mean by "any" `JSON` or `YAML`?"
        `Pheno-Ranker` can process deeply nested data structures. From v1.08 onward, arrays nested more than one level deep are canonicalized automatically from their meaningful content, so equivalent nested objects can match even if their order differs between records.

        For first-level arrays in generic JSON, set `format: JSON` and declare `indexed_terms`. You can also add `identity_paths` to keep user-facing keys more interpretable, but from v1.08 onward generic JSON can infer default identities when those paths are absent. For deeper nested arrays, no extra identity path is required.

=== "CSV"

    We developed an utility that converts `CSV` files to `JSON` and automatically creates the **configuration file** needed. See an example on how to use it [here](csv-import.md). 
