# Data Origin

[HPO Annotations](https://hpo.jax.org/data/annotations)

# Download Date

**January 25, 2025**

# Downloaded Files

I don't have a local copy of the files. Please download them from the [HPO website](https://hpo.jax.org/data/annotations).

### Used: `genes_to_phenotype.txt`
### Not Used: `phenotype_to_genes.txt` (Contains Ancestors)

# Usage

```bash
perl scripts/hpo_disease_converter.pl -i genes_to_phenotype.txt -f bff
perl scripts/hpo_disease_converter.pl -i genes_to_phenotype.txt -f pxf
gzip *json
```
