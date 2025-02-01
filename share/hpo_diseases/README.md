# Data Origin

https://hpo.jax.org/data/annotations

# Download Date

January-25, 2025

# Files:

### Used `data/genes_to_phenotype.txt`

### Non-used `data/phenotype_to_genes.txt` HAS ANCESTORS

# Usage

```bash
perl scripts/hpo_disease_converter.pl -i data/genes_to_phenotype.txt -f bff
perl scripts/hpo_disease_converter.pl -i data/genes_to_phenotype.txt -f pxf
gzip *json
```

# HPO Citation

Gargano MA, et al. The Human Phenotype Ontology in 2024: phenotypes around the world. Nucleic Acids Res. 2024 Jan 5;52(D1):D1333-D1346. doi: 10.1093/nar/gkad1005. PMID: 37953324; PMCID: PMC10767975., [doi](https://doi.org/10.1093/nar/gkad1005)


