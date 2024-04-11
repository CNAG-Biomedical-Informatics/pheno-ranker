# BFF-PXF-SIMULATOR

=== "Explanation"

    We have developed a tool for generating **simulated** (synthetic) data in either [BFF](bff.md) or [PXF](pxf.md) formats. 

    The tool, `bff-pxf-simulator`, is included as an executable (if downloaded from CPAN) or found in the `utils` directory (if downloaded from GitHub or Docker).

    !!! Example "Potential uses for synthetic data"

        The simulated data can be used to:

        * Testing software and installations
        * Benchmarking
        * Sample classification
        * Outlier identification
        * ...

    ??? Info "Default Ontologies used"
        Below are the default ontology terms utilized by the script. Please note that it is possible to use an external ontologies YAML file instead, by employing the `--external-ontologies` flag.

        The word "ontology" is used broadly here, including terms from recognized ontologies (e.g., [HPO](https://en.wikipedia.org/wiki/Human_Phenotype_Ontology) and [NCIt](https://ncithesaurus.nci.nih.gov/ncitbrowser/)), as well as terminologies (e.g., (e.g., [LOINC](https://en.wikipedia.org/wiki/LOINC) or [RxNorm](https://en.wikipedia.org/wiki/RxNorm)). While the latter do not meet the stringent criteria of ontologies, they fulfill analogous roles in facilitating data standardization.

         ```yaml
         --8<-- "https://raw.githubusercontent.com/CNAG-Biomedical-Informatics/pheno-ranker/main/utils/bff_pxf_simulator/ontologies.yaml"
         ```
           
=== "Usage"
    --8<-- "https://raw.githubusercontent.com/CNAG-Biomedical-Informatics/pheno-ranker/main/utils/bff_pxf_simulator/README.md"
