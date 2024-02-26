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

    ??? Info "Default Ontologies Used"
         Below are the default ontologies utilized by the script. Please note that it is possible to use an external ontologies YAML file instead, by employing the `--external-ontologies` flag.

         ```yaml
         --8<-- "https://raw.githubusercontent.com/CNAG-Biomedical-Informatics/pheno-ranker/main/utils/bff_pxf_simulator/ontologies.yaml"
         ```
           
=== "Usage"
    --8<-- "https://raw.githubusercontent.com/CNAG-Biomedical-Informatics/pheno-ranker/main/utils/bff_pxf_simulator/README.md"
