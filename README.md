<p align="center">
  <a href="https://github.com/cnag-biomedical-informatics/pheno-ranker"><img src="https://raw.githubusercontent.com/cnag-biomedical-informatics/pheno-ranker/main/docs/img/PR-logo.png" width="400" alt="Pheno-Ranker"></a>
</p>
<p align="center">
    <em>Pheno-Ranker: a toolkit for comparison of phenotypic data stored in GA4GH standards and beyond</em>
</p>

[![Build and Test](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/build-and-test.yml)
[![Coverage Status](https://coveralls.io/repos/github/CNAG-Biomedical-Informatics/pheno-ranker/badge.svg?branch=main)](https://coveralls.io/github/CNAG-Biomedical-Informatics/pheno-ranker?branch=main)
[![CPAN Publish](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/cpan-publish.yml/badge.svg)](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/cpan-publish.yml)
[![Kwalitee Score](https://cpants.cpanauthors.org/dist/Pheno-Ranker.svg)](https://cpants.cpanauthors.org/dist/Pheno-Ranker)
![version](https://img.shields.io/badge/version-1.01-28a745)
[![Docker Build](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/docker-build.yml/badge.svg)](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/docker-build.yml)
[![Docker Pulls](https://badgen.net/docker/pulls/manuelrueda/pheno-ranker?icon=docker&label=pulls)](https://hub.docker.com/r/manuelrueda/pheno-ranker/)
[![Docker Image Size](https://badgen.net/docker/size/manuelrueda/pheno-ranker?icon=docker&label=image%20size)](https://hub.docker.com/r/manuelrueda/pheno-ranker/)
[![Documentation Status](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/documentation.yml/badge.svg)](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/documentation.yml)
[![License: Artistic-2.0](https://img.shields.io/badge/License-Artistic%202.0-0298c3.svg)](https://opensource.org/licenses/Artistic-2.0)
[![Google Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1n3Etu4fnwuDWNveSMb1SzuN50O2a05Rg)

---

**Documentation**: <a href="https://cnag-biomedical-informatics.github.io/pheno-ranker" target="_blank">https://cnag-biomedical-informatics.github.io/pheno-ranker</a>

**Google Colab tutorial**: <a href="https://colab.research.google.com/drive/1n3Etu4fnwuDWNveSMb1SzuN50O2a05Rg" target="_blank">https://colab.research.google.com/drive/1n3Etu4fnwuDWNveSMb1SzuN50O2a05Rg</a>

**CPAN Distribution**: <a href="https://metacpan.org/pod/Pheno::Ranker" target="_blank">https://metacpan.org/pod/Pheno::Ranker</a>

**Docker Hub Image**: <a href="https://hub.docker.com/r/manuelrueda/pheno-ranker/tags" target="_blank">https://hub.docker.com/r/manuelrueda/pheno-ranker/tags</a>

**Web App UI**: <a href="https://pheno-ranker.cnag.eu" target="_blank">https://pheno-ranker.cnag.eu</a>

**Pheno-Ranker App**: <a href="https://github.com/CNAG-Biomedical-Informatics/pheno-ranker-app" target="_blank">https://github.com/CNAG-Biomedical-Informatics/pheno-ranker-app</a>

---

# Table of contents
- [Description](#description)
  - [Name](#name)
  - [Synopsis](#synopsis)
  - [Summary](#summary)
- [Installation](#installation)
  - [Non-Containerized](#non-containerized)
  - [Containerized](#containerized)
- [How to run pheno-ranker](#how-to-run-pheno-ranker)
- [Citation](#citation)
  - [Author](#author)
- [License](#copyright-and-license)

# NAME

pheno-ranker: A script that performs semantic similarity in PXF/BFF data structures and beyond (JSON|YAML)

# SYNOPSIS

    pheno-ranker -r <individuals.json> -t <patient.json> [-options]

      Arguments:
        * Cohort mode:
          -r, --reference <file>         BFF/PXF file(s) in JSON or YAML format (array or object)

        * Patient mode:
          -t, --target <file>            BFF/PXF file in JSON or YAML format (object or array of 1 object)

      Options:
        -age                             Include age-related variables; excludes agent-like terms (BFF/PXF-only) [>no-age|age]
        -a, --align [path/basename]      Write alignment file(s). If not specified, default filenames are used [default: alignment.*]
        -append-prefixes <prefixes>      Prefixes for primary_key when #cohorts >= 2 [default: C]
        -config <file>                   YAML config file to modify default parameters [default: share/conf/config.yaml]
        -cytoscape-json [file]           Serializes the pairwise comparison matrix as an undirected graph in JSON, compatible with Cytoscape [default: graph.json]
        -e, --export [path/basename]     Export miscellaneous JSON files. If not specified, default filenames are used [default: export.*]
        -exclude-terms <terms>           Exclude BFF/PXF terms (e.g., --exclude-terms sex, id) or column names in JSON-derived from CSV 
        -graph-stats [file]              Generates a text file with key graph metrics, for use with <-cytoscape-json> [default: graph_stats.txt]
        -include-hpo-ascendants          Include ascendant terms from the Human Phenotype Ontology (HPO)
        -include-terms <terms>           Include BFF/PXF terms (e.g., --include-terms diseases) or column names in JSON-derived from CSV
        -max-number-var <number>         Maximum variables for binary string [default: 10000]
        -max-out <number>                Print only N comparisons [default: 50]
        -o, --out-file <file>            Output file path [default: -r matrix.txt | -t rank.txt]
        -poi, --patients-of-interest <id_list>   Export JSON files for the selected individual IDs during a dry-run
        -poi-out-dir <directory>         Directory for JSON files (used with --poi)
        -similarity-metric-cohort <metric>  Similarity metric for cohort mode [>hamming|jaccard]
        -sort-by <metric>                Sort by Hamming distance or Jaccard index [>hamming|jaccard]
        -w, --weights <file>             YAML file with weights

      Generic Options:
        -debug <level>                   Print debugging (from 1 to 5, being 5 max)
        -h, --help                       Brief help message
        -log                             Save log file [default: pheno-ranker-log.json]
        -man                             Full documentation
        -no-color                        Toggle color output [>color|no-color]
        -v, --verbose                    Verbosity on
        -V, --version                    Print version

# SUMMARY

Pheno-Ranker is a lightweight, easy-to-install tool for performing semantic similarity analysis on phenotypic data in JSON/YAML formats, including Beacon v2 Models and Phenopackets v2. It also supports pre-processed CSV files prepared using the included `csv2pheno-ranker` utility.

# INSTALLATION

If you plan to only use `pheno-ranker` CLI, we recommend installing it via CPAN. See details below.

## Non containerized

The script runs on command-line Linux and it has been tested on Debian/RedHat/macOS based distributions (only showing commands for Debian). Perl 5 is installed by default on Linux, 
but we will install a few CPAN modules with `cpanminus`.

### Method 1: From CPAN

First install system level dependencies:

    sudo apt-get install cpanminus libperl-dev

Now you have to choose between one of the 2 options below:

**Option 1:** System-level installation:

    cpanm --notest --sudo Pheno::Ranker
    pheno-ranker -h

**Option 2:** Install Pheno-Ranker and the dependencies at `~/perl5`

    cpanm --local-lib=~/perl5 local::lib && eval $(perl -I ~/perl5/lib/perl5/ -Mlocal::lib)
    cpanm --notest Pheno::Ranker
    pheno-ranker --help

To ensure Perl recognizes your local modules every time you start a new terminal, you should type:

    echo 'eval $(perl -I ~/perl5/lib/perl5/ -Mlocal::lib)' >> ~/.bashrc

### Method 2: From CPAN in a CONDA environment

Please follow [these instructions](https://cnag-biomedical-informatics.github.io/pheno-ranker/download-and-installation/#__tabbed_1_2).

### Method 3: From GitHub

    git clone https://github.com/cnag-biomedical-informatics/pheno-ranker.git
    cd pheno-ranker

Install system level dependencies:

    sudo apt-get install cpanminus libperl-dev

Now you have to choose between one of the 2 options below:

**Option 1:** Install dependencies (they're harmless to your system) as `sudo`:

    cpanm --notest --sudo --installdeps .
    bin/pheno-ranker --help            

**Option 2:** Install the dependencies at `~/perl5`:

    cpanm --local-lib=~/perl5 local::lib && eval $(perl -I ~/perl5/lib/perl5/ -Mlocal::lib)
    cpanm --notest --installdeps .
    bin/pheno-ranker --help

To ensure Perl recognizes your local modules every time you start a new terminal, you should type:

    echo 'eval $(perl -I ~/perl5/lib/perl5/ -Mlocal::lib)' >> ~/.bashrc

_Optional:_ If you want to use `utils/barcode` or `utils/bff_pxf_plot`:

    sudo apt-get install python3-pip libzbar0
    pip3 install -r requirements.txt

## Containerized

### Method 4: From Docker Hub

Download the latest version of the Docker image (supports both amd64 and arm64 architectures) from [Docker Hub](https://hub.docker.com/r/manuelrueda/convert-pheno) by executing:

    docker pull manuelrueda/pheno-ranker:latest
    docker image tag manuelrueda/pheno-ranker:latest cnag/pheno-ranker:latest

See additional instructions below.

### Method 5: With Dockerfile

Please download the `Dockerfile` from the repo:

    wget https://raw.githubusercontent.com/cnag-biomedical-informatics/pheno-ranker/main/Dockerfile

And then run:

    # Docker Version 19.03 and Above (Supports buildx)
    docker buildx build -t cnag/pheno-ranker:latest .

    # Docker Version Older than 19.03 (Does Not Support buildx)
    docker build -t cnag/pheno-ranker:latest .

### Additional instructions for Methods 4 and 5

To run the container (detached) execute:

    docker run -tid -e USERNAME=root --name pheno-ranker cnag/pheno-ranker:latest

To enter:

    docker exec -ti pheno-ranker bash

The command-line executable can be found at:

    /usr/share/pheno-ranker/bin/pheno-ranker

The default container user is `root` but you can also run the container as `$UID=1000` (`dockeruser`). 

     docker run --user 1000 -tid --name pheno-ranker cnag/pheno-ranker:latest
    

### Mounting volumes

Docker containers are fully isolated. If you need the mount a volume to the container please use the following syntax (`-v host:container`). 
Find an example below (note that you need to change the paths to match yours):

    docker run -tid --volume /media/mrueda/4TBT/data:/data --name pheno-ranker-mount cnag/pheno-ranker:latest

Then I will do something like this:

    # First I create an alias to simplify invocation (from the host)
    alias pheno-ranker='docker exec -ti pheno-ranker-mount /usr/share/pheno-ranker/bin/pheno-ranker'

    # Now I use the alias to run the command (note that I use the flag --o to specify the filepath)
    pheno-ranker -r /data/individuals.json -o /data/matrix.txt

### System requirements

    * Ideally a Debian-based distribution (Ubuntu or Mint), but any other (e.g., CentOS, OpenSUSE) should do as well.
      (It should also work on macOS and Windows Server, but we are only providing information for Linux here)
    * Perl 5 (>= 5.26 core; installed by default in most Linux distributions). Check the version with "perl -v".
    * >= 4GB of RAM
    * 1 core
    * At least 16GB HDD

# HOW TO RUN PHENO-RANKER

For executing pheno-ranker you will need a PXF/BFF file(s) in JSON|YAML format. The reference cohort must be a JSON array, where each individual data are consolidated in one object.

You can download examples from [this location](https://github.com/CNAG-Biomedical-Informatics/pheno-ranker/tree/main/share/ex).

There are two modes of operation:

- Cohort mode:

    **Intra-cohort:** With `--r` argument and 1 cohort.

    **Inter-cohort:** With `--r` and multiple cohort files. It can be used in combination with `--append-prefixes` to add prefixes to each individual id.

- Patient Mode:

    With `-r` reference cohort(s) and `--t` patient data.

**Examples:**

    $ ./pheno-ranker -r phenopackets.json  # intra-cohort

    $ ./pheno-ranker -r phenopackets.yaml -o my_matrix.txt # intra-cohort

    $ ./pheno-ranker -r phenopackets.json -w weights.yaml --exclude-terms sex ethnicity exposures # intra-cohort with weights

    $ $path/pheno-ranker -r individuals.json others.yaml --append-prefixes CANCER CONTROL  # inter-cohort

    $ $path/pheno-ranker -r individuals.json -t patient.yaml -max-out 100 # mode patient

## COMMON ERRORS AND SOLUTIONS

    * Error message: R plotting
        Error in scan(file = file, what = what, sep = sep, quote = quote, dec = dec,  : 
        line 1 did not have X elements
        Calls: as.matrix -> read.table -> scan
        Execution halted
      Solution: Make sure that the values of your primary key (e.g., "id") do not contain spaces (e.g., "my fav id" must be "my_fav_id")

    * Error message: Foo
      Solution: Bar

# CITATION

The author requests that any published work that utilizes `Pheno-Ranker` includes a cite to the following reference:

Leist, I.C. et al., (2024). Pheno-Ranker: a toolkit for comparison of phenotypic data stored in GA4GH standards and beyond. _BMC Bioinformatics_. DOI: 10.1186/s12859-024-05993-2

# AUTHOR 

Written by Manuel Rueda, PhD. Info about CNAG can be found at [https://www.cnag.eu](https://www.cnag.eu).

# COPYRIGHT AND LICENSE

This PERL file is copyrighted. See the LICENSE file included in this distribution.
