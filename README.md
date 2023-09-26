<p align="center">
  <a href="https://github.com/cnag-biomedical-informatics/pheno-ranker"><img src="https://raw.githubusercontent.com/cnag-biomedical-informatics/pheno-ranker/main/docs/img/PR-logo.png" width="400" alt="Pheno-Ranker"></a>
</p>
<p align="center">
    <em>Advancing Semantic Similarity Analysis of Phenotypic Data Stored in GA4GH Standards and Beyond</em>
</p>

[![Build and Test](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/build-and-test.yml)
[![Coverage Status](https://coveralls.io/repos/github/CNAG-Biomedical-Informatics/pheno-ranker/badge.svg?branch=main)](https://coveralls.io/github/CNAG-Biomedical-Informatics/pheno-ranker?branch=main)
[![CPAN Publish](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/cpan-publish.yml/badge.svg)](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/cpan-publish.yml)
[![Kwalitee Score](https://cpants.cpanauthors.org/dist/Pheno-Ranker.svg)](https://cpants.cpanauthors.org/dist/Pheno-Ranker)
![version](https://img.shields.io/badge/version-0.00_2_beta-orange)
[![Docker Build](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/docker-build.yml/badge.svg)](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/docker-build.yml)
[![Docker Pulls](https://badgen.net/docker/pulls/manuelrueda/pheno-ranker?icon=docker&label=pulls)](https://hub.docker.com/r/manuelrueda/pheno-ranker/)
[![Docker Image Size](https://badgen.net/docker/size/manuelrueda/pheno-ranker?icon=docker&label=image%20size)](https://hub.docker.com/r/manuelrueda/pheno-ranker/)
[![Documentation Status](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/documentation.yml/badge.svg)](https://github.com/cnag-biomedical-informatics/pheno-ranker/actions/workflows/documentation.yml)
[![License: Artistic-2.0](https://img.shields.io/badge/License-Artistic%202.0-0298c3.svg)](https://opensource.org/licenses/Artistic-2.0)

**Documentation**: <a href="https://cnag-biomedical-informatics.github.io/pheno-ranker" target="_blank">https://cnag-biomedical-informatics.github.io/pheno-ranker</a>

**CLI Source Code**: <a href="https://github.com/cnag-biomedical-informatics/pheno-ranker" target="_blank">https://github.com/cnag-biomedical-informatics/pheno-ranker</a>

**Web App UI Source Code**: <a href="https://github.com/cnag-biomedical-informatics/pheno-ranker-ui" target="_blank">https://github.com/cnag-biomedical-informatics/pheno-ranker-ui</a>

**CPAN Module**: <a href="https://metacpan.org/pod/Pheno::Ranker" target="_blank">https://metacpan.org/pod/Pheno::Ranker</a>

# NAME

pheno-ranker: A script that performs semantic similarity in PXF/BFF data structures and beyond (JSON|YAML)

# SYNOPSIS

pheno-ranker -r &lt;individuals.json> -t &lt;patient.json> \[-options\]

     Arguments:                       
     * Cohort mode:
       -r|reference                   BFF/PXF file(s) (JSON|YAML array or object)

     * Patient mode:
       -t|target                      BFF/PXF file (JSON|YAML object or array of 1 object)

     Options:
       -age                           Include age-related variables [>no-age|age]
       -a|align                       Write alignment file(s). If no argument is given the files will be named [alignment.*]
       -append-prefixes               The prefixes to be added to the primary_key of individuals when #cohorts >= 2 [C]
       -config                        YAML config file to change default parameters [conf/config.yaml)
       -e|export                      Export miscellanea JSON files. If no argument is given the files will be named [export.*]
       -exclude-terms                 Exclude BFF/PXF terms (e.g., --exclude-terms sex id)
       -include-hpo-ascendants        Include ascendant terms from the Human Phenotype Ontology (HPO)
       -include-terms                 Include BFF/PXF terms (e.g., --ixclude-terms diseases)
       -max-number-var                Maximum number of variables to be used in binary string [10000]
       -max-out                       Print only N of comparisons (used with --t)  [50]
       -o                             Output file [-r matrix.txt|-t rank.txt]
       -poi|patients-of-interest      Export JSON files for the selected individual ids (dry-run)
       -poi-out-dir                   Directory where to write JSON files (to be used with --poi)
       -sort-by                       Sort reference-patient comparison by Hamming-distance or Jaccard-index [>hamming|jaccard]
       -w|weights                     YAML file with weights

     Generic Options:
       -debug                         Print debugging (from 1 to 5, being 5 max)
       -h|help                        Brief help message
       -log                           Save log file (JSON). If no argument is given then the log is named [pheno-ranker-log.json]
       -man                           Full documentation
       -no-color                      Don't print colors to STDOUT [>color|no-color]
       -v|verbose                     Verbosity on
       -V|version                     Print version

# DESCRIPTION

pheno-ranker: A script that performs semantic similarity in PXF/BFF data structures and beyond (JSON|YAML)

# SUMMARY

Pheno-Ranker is a lightweight and easily to install tool specifically designed for performing semantic similarity analysis on phenotypic data structured in JSON format, such as Beacon v2 Models or Phenopackets v2.

# INSTALLATION

## Containerized (Recommended Method)

### Method 1: From Docker Hub

Download a docker image (latest version - amd64|x86-64) from [Docker Hub](https://hub.docker.com/r/manuelrueda/pheno-ranker) by executing:

    docker pull manuelrueda/pheno-ranker:latest
    docker image tag manuelrueda/pheno-ranker:latest cnag/pheno-ranker:latest

See additional instructions below.

### Method 2: With Dockerfile

Please download the `Dockerfile` from the repo:

    wget https://raw.githubusercontent.com/cnag-biomedical-informatics/pheno-ranker/main/Dockerfile

And then run:

    docker build -t cnag/pheno-ranker:latest .

### Additional instructions for Methods 1 and 2

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

## Non containerized

The script runs on command-line Linux and it has been tested on Debian/RedHat/MacOS based distributions (only showing commands for Debian's). Perl 5 is installed by default on Linux, 
but we will install a few CPAN modules with `cpanminus`.

### From Github

    git clone https://github.com/cnag-biomedical-informatics/pheno-ranker.git
    cd pheno-ranker

Install system level dependencies:

    sudo apt-get install cpanminus libbz2-dev zlib1g-dev libperl-dev libssl-dev

Now you have two choose between one of the 3 options below:

**Option 1:** Install dependencies (they're harmless to your system) as `sudo`:

    cpanm --notest --sudo --installdeps .
    bin/pheno-ranker --help            

**Option 2:** Install the dependencies at `~/perl5`:

    cpanm --local-lib=~/perl5 local::lib && eval $(perl -I ~/perl5/lib/perl5/ -Mlocal::lib)
    cpanm --notest --installdeps .
    bin/pheno-ranker --help

**Option 3:** Install the dependencies in a "virtual environment" (at `local/`) . We'll be using the module `Carton` for that:

    mkdir local
    cpanm --notest --local-lib=local/ Carton
    export PATH=$PATH:local/bin; export PERL5LIB=$(pwd)/local/lib/perl5:$PERL5LIB
    carton install
    carton exec -- bin/pheno-ranker -help

### From CPAN

First install system level dependencies:

    sudo apt-get install cpanminus libbz2-dev zlib1g-dev libperl-dev libssl-dev

Now you have two choose between one of the 3 options below:

**Option 1:** System-level installation:

    cpanm --notest --sudo Pheno::Ranker
    pheno-ranker -h

**Option 2:** Install Pheno-Ranker and the dependencies at `~/perl5`

    cpanm --local-lib=~/perl5 local::lib && eval $(perl -I ~/perl5/lib/perl5/ -Mlocal::lib)
    cpanm --notest Pheno::Ranker
    pheno-ranker --help

**Option 3:** Install Pheno-Ranker and the dependencies in a "virtual environment" (at `local/`) . We'll be using the module `Carton` for that:

    mkdir local
    cpanm --notest --local-lib=local/ Carton
    echo "requires 'Pheno::Ranker';" > cpanfile
    export PATH=$PATH:local/bin; export PERL5LIB=$(pwd)/local/lib/perl5:$PERL5LIB
    carton install
    carton exec -- pheno-ranker -help

### System requirements

    * Ideally a Debian-based distribution (Ubuntu or Mint), but any other (e.g., CentOs, OpenSuse) should do as well.
    * Perl 5 (>= 5.26 core; installed by default in most Linux distributions). Check the version with "perl -v".
    * >= 4GB of RAM
    * 1 core
    * At least 16GB HDD

# HOW TO RUN PHENO-RANKER

For executing pheno-ranker you will need a PXF/BFF file(s) in JSON|YAML format. The reference cohort must be a JSON array, where each individual data are consolidated in one object.

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

    * Error message: Foo
      Solution: Bar

    * Error message: Foo
      Solution: Bar

# CITATION

The author requests that any published work that utilizes `Pheno-Ranker` includes a cite to the the following reference:

Rueda, M et al., (2023). Advancing Semantic Similarity Analysis of Phenotypic Data Stored in GA4GH Standards and Beyond. _Manuscript in preparation_.

# AUTHOR 

Written by Manuel Rueda, PhD. Info about CNAG can be found at [https://www.cnag.eu](https://www.cnag.eu).

# COPYRIGHT AND LICENSE

This PERL file is copyrighted. See the LICENSE file included in this distribution.
