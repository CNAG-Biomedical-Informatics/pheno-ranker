# What is Pheno-Ranker?

`Pheno-Ranker` is an open-source toolkit developed for the semantic similarity analysis of phenotypic and clinical data. It natively supports GA4GH standards, such as [Phenopackets v2](pxf.md) and [Beacon v2](bff.md), using as input their JSON/YAML data exchange formats. Beyond these specific standards, Pheno-Ranker is designed to be highly versatile, capable of handling any data serialized into `JSON`, `YAML`, and `CSV` formats, extending its utility beyond the health data domain. Pheno-Ranker transforms hierarchical data into binary digit strings, enabling efficient similarity matching both within cohorts and between individual patients and reference cohorts.

<figure markdown>
 ![Pheno-Ranker](img/PR-logo.png){width="350"}
 <figcaption>Pheno-Ranker logo</figcaption>
</figure>

!!! Tip "Use"

    `Pheno-Ranker` core is is a [Perl module](https://metacpan.org/pod/Pheno::Ranker) that can be operated as a:

    * [Command-line tool](cohort.md)
    * [Web App UI](https://pheno-ranker.cnag.eu)
