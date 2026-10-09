<p align="center">
  <a href="https://github.com/cnag-biomedical-informatics/pheno-ranker"><img src="https://raw.githubusercontent.com/cnag-biomedical-informatics/pheno-ranker/main/docs-site/static/img/PR-logo.png" width="400" alt="Pheno-Ranker"></a>
</p>
<p align="center">
    <em>Pheno-Ranker: a toolkit for comparison of phenotypic data stored in GA4GH standards and beyond</em>
</p>

[![Build and Test](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/build-and-test.yml)
[![Build and Test Windows](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/build-and-test-windows.yml/badge.svg)](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/build-and-test-windows.yml)
[![Coverage Status](https://coveralls.io/repos/github/CNAG-Biomedical-Informatics/pheno-ranker/badge.svg?branch=main)](https://coveralls.io/github/CNAG-Biomedical-Informatics/pheno-ranker?branch=main)
[![CPAN Publish](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/cpan-publish.yml/badge.svg)](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/cpan-publish.yml)
[![Kwalitee Score](https://cpants.cpanauthors.org/dist/Pheno-Ranker.svg)](https://cpants.cpanauthors.org/dist/Pheno-Ranker)
![version](https://img.shields.io/badge/version-1.09-28a745)
[![Docker Build](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/docker-build-multi-arch.yml/badge.svg)](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/docker-build-multi-arch.yml)
[![Docker Pulls](https://badgen.net/docker/pulls/manuelrueda/pheno-ranker?icon=docker&label=pulls)](https://hub.docker.com/r/manuelrueda/pheno-ranker/)
[![Docker Image Size](https://badgen.net/docker/size/manuelrueda/pheno-ranker?icon=docker&label=image%20size)](https://hub.docker.com/r/manuelrueda/pheno-ranker/)
[![Documentation Status](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/documentation.yml/badge.svg)](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/documentation.yml)
[![License](https://img.shields.io/badge/License-Artistic%202.0-0298c3.svg)](https://opensource.org/licenses/Artistic-2.0)
[![Google Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1n3Etu4fnwuDWNveSMb1SzuN50O2a05Rg)

---

[🖥️ Desktop](https://cnag-biomedical-informatics.github.io/pheno-ranker/desktop/) ·
[📘 Documentation](https://cnag-biomedical-informatics.github.io/pheno-ranker/) ·
[💻 CLI Installation](https://cnag-biomedical-informatics.github.io/pheno-ranker/download-and-installation/) ·
[📖 CLI Usage](https://cnag-biomedical-informatics.github.io/pheno-ranker/usage/) ·
[📓 Google Colab](https://colab.research.google.com/drive/1n3Etu4fnwuDWNveSMb1SzuN50O2a05Rg) ·
[📦 CPAN](https://metacpan.org/pod/Pheno::Ranker) ·
[🐳 Docker](https://hub.docker.com/r/manuelrueda/pheno-ranker/tags) ·
[🌐 Legacy Web App](https://pheno-ranker.cnag.eu)

# Pheno-Ranker

**Pheno-Ranker** compares phenotypic, clinical, and other categorical records.
It supports Beacon Friendly Format (BFF), Phenopackets (PXF), and generic JSON
data, using Hamming distance or Jaccard similarity to compare cohorts or rank
reference records against a target patient.

## Use Pheno-Ranker

The **Desktop app**, introduced in v1.09, provides guided setup, local analysis,
and interactive results, including patient alignments, MDS/UMAP plots, and
networks. Companion tools support CSV import, record simulation, phenotype
summaries, QR codes, and PDF reports.

The **CLI** remains available for scripts, R/Python automation, and batch
analyses. Desktop and CLI use the same analysis engine; CPAN distributes the
CLI independently.

Desktop replaces the [legacy Web App UI](https://pheno-ranker.cnag.eu).
Its [documentation](https://cnag-biomedical-informatics.github.io/pheno-ranker-ui/)
remains available.

Similarity results support research and exploration, not clinical diagnosis.

## Citation

If you use Pheno-Ranker in published work, please cite:

Leist, I.C. et al. (2024). *Pheno-Ranker: a toolkit for comparison of phenotypic data stored in GA4GH standards and beyond*. BMC Bioinformatics. <https://doi.org/10.1186/s12859-024-05993-2>

## Author and License

Manuel Rueda, PhD. [CNAG](https://www.cnag.eu).

Pheno-Ranker is distributed under the [Artistic License 2.0](LICENSE).
Third-party components and datasets retain their own licensing terms.
