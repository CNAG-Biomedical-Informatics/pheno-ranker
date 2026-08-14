## Project

Pheno-Ranker is a Perl command-line tool for similarity analysis of phenotypic,
clinical, and other categorical data. The repository also contains Perl and
Python companion utilities and external R scripts.

## Commands

- `bin/pheno-ranker --help`
- `prove -lr t`
- `prove -lr xt` for local extended tests
- `cd docs-site && npm run typecheck`
- `cd docs-site && npm run build`

## Rules

- Passing tests is required before committing code changes.
- Keep CPAN tests portable across Linux, macOS, and Windows.
- Use `File::Temp` for temporary files and directories in Perl tests.
- Do not change published documentation routes without adding a working
  redirect.

## Published Documentation Routes

Publication files used to audit external links:

- Main article: `https://doi.org/10.1186/s12859-024-05993-2`
- Additional file 1:
  `https://static-content.springer.com/esm/art%3A10.1186%2Fs12859-024-05993-2/MediaObjects/12859_2024_5993_MOESM1_ESM.pdf`
- Additional file 2:
  `https://static-content.springer.com/esm/art%3A10.1186%2Fs12859-024-05993-2/MediaObjects/12859_2024_5993_MOESM2_ESM.pdf`

Local audit copies are kept in the untracked `pdf/` directory so they do not
need to be downloaded for every documentation review:

- `pdf/12859_2024_5993_manuscript.pdf`
- `pdf/12859_2024_5993_MOESM1_ESM.pdf`
- `pdf/12859_2024_5993_MOESM2_ESM.pdf`

Do not stage or commit the `pdf/` directory.

The following documentation URLs are linked from the article or its
supplementary information and must not be renamed or removed without a working
redirect:

- `https://cnag-biomedical-informatics.github.io/pheno-ranker/`
- `https://cnag-biomedical-informatics.github.io/pheno-ranker/download-and-installation`
- `https://cnag-biomedical-informatics.github.io/pheno-ranker/bff-pxf-plot/`
- `https://cnag-biomedical-informatics.github.io/pheno-ranker/bff-pxf-simulator/`
- `https://cnag-biomedical-informatics.github.io/pheno-ranker/csv-import/`
- `https://cnag-biomedical-informatics.github.io/pheno-ranker/qr-code-generator/`

The supplementary information also links to the separate Web App documentation
at `https://cnag-biomedical-informatics.github.io/pheno-ranker-ui/`.

The following repository locations are linked from the publication and must not
be moved without preserving the existing URL or adding an appropriate pointer:

- `https://github.com/CNAG-Biomedical-Informatics/pheno-ranker`
- `https://github.com/CNAG-Biomedical-Informatics/pheno-ranker/tree/main/utils/bff_pxf_simulator`
- `https://github.com/CNAG-Biomedical-Informatics/pheno-ranker/tree/main/share`
- `https://github.com/CNAG-Biomedical-Informatics/pheno-ranker/tree/main/share/fig`

## Installation Nomenclature

Additional file 2 defines `D` as Docker, `G` as GitHub, and `C` as CPAN. Keep
these codes and the following numbered methods consistent across
`docs-site/docs/download-and-installation.mdx`, `non-containerized/README.md`,
and `docker/README.md`:

1. Method 1: From CPAN (`C`)
2. Method 2: Isolated Conda environment, with Pheno-Ranker installed from CPAN
   (`C`)
3. Method 3: From GitHub (`G`)
4. Method 4: From Docker Hub (`D`)
5. Method 5: With Dockerfile (`D`)

The installation page may summarize or link to the detailed instructions, but
the method numbers, order, and `D/G/C` meanings must remain stable.
