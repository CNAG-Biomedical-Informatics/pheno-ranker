!!! Info "Compatibility"

    The `Pheno-Ranker` Perl command-line interface is tested on Linux, macOS, and Windows via GitHub Actions.

    | Operating System | Support |
    |------------------|---------|
    | Linux            | Recommended for CLI, Docker, and utility workflows |
    | macOS            | Supported for non-containerized CLI use |
    | Windows          | Supported for the Perl CLI; use Docker, WSL, or a Perl environment such as Strawberry Perl |

    Optional Python/R utilities are not part of the CPAN-centered Windows test matrix. For those workflows, Docker or a GitHub checkout is recommended.

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
