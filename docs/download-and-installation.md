!!! Info "Compatibility"

    `Pheno-Ranker` is designed for local execution on Linux or macOS workstations and servers.

    | Operating System | Support |
    |------------------|---------|
    | Linux            | Recommended |
    | macOS            | Supported for non-containerized CLI use |
    | Windows          | Use Docker, WSL, or a Unix-like Perl environment |

We provide containerized and non-containerized installation paths. This page stays as the canonical documentation entry point for installation.

???+ Question "Which download method should I use?"

    It depends on which components you need and whether you want to manage Perl/Python dependencies yourself.

    | Use case | Recommended path |
    | -- | -- |
    | CLI only | Non-containerized CPAN install |
    | CLI in an isolated environment | Non-containerized Conda install |
    | CLI plus Python utilities | Docker or GitHub checkout |
    | Web App UI | [Pheno-Ranker UI](https://cnag-biomedical-informatics.github.io/pheno-ranker-ui) |

## Non-Containerized

Use this path when you want to run `pheno-ranker` directly from CPAN, GitHub, Conda, or your own Perl environment.

The CPAN distribution includes:

- `Pheno::Ranker`
- `pheno-ranker`
- `bff-pxf-simulator`
- `csv2pheno-ranker`

Detailed instructions:

- [non-containerized/README.md](https://github.com/CNAG-Biomedical-Informatics/pheno-ranker/blob/main/non-containerized/README.md)

## Containerized

Use this path when you want a reproducible environment with Perl and Python dependencies preinstalled.

The Docker image includes:

- `Pheno::Ranker`
- `pheno-ranker`
- `bff-pxf-simulator`
- `bff-pxf-plot`
- `csv2pheno-ranker`
- QR-code utilities

Detailed instructions:

- [docker/README.md](https://github.com/CNAG-Biomedical-Informatics/pheno-ranker/blob/main/docker/README.md)
