# NAME

pheno-ranker: A script that compares a given BFF/PXF file against a BFF/PXF cohort

# SYNOPSIS

pheno-ranker -r &lt;individuals.json> -t &lt;patient.json> \[-options\]

     Arguments:                       
       -r|reference                   BFF/PXF file (JSON|YAML array)
       -t|target                      BFF/PXF file (JSON|YAML array or object)
       -cohorts                       BFF/PXF files (JSON|YAML array or object)

     Options:
       -age                           Include age-related variables [>no-age|age]
       -align                         Write alignment file(s). If no argument is given the files will be named [alignment.*]
       -append-suffixes               The suffixes to be added to the primary_key of objects in each cohort file [C]
       -config                        YAML config file to change default parameters [conf/config.yaml)
       -e|export                      Export miscellanea JSON files
       -exclude-terms                 Exclude BFF/PXF terms (e.g., --exclude-terms sex id)
       -include-hpo-ascendants        Include ascendant terms from the Human Phenotype Ontology (HPO)
       -include-terms                 Include BFF/PXF terms (e.g., --ixclude-terms diseases)
       -max-out                       Print only N of comparisons (used with --t)  [50]
       -o                             Output file [matrix.txt]
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

pheno-ranker: A script that compares a given BFF/PXF file against a BFF/PXF cohort

# SUMMARY

pheno-ranker: A script that compares and ranks (by dissimilarity) a given BFF/PXF file against a BFF/PXF cohort

# INSTALLATION

    $ cpanm sudo --installdeps .

### System requirements

    * Ideally a Debian-based distribution (Ubuntu or Mint), but any other (e.g., CentOs, OpenSuse) should do as well.
    * Perl 5 (>= 5.10 core; installed by default in most Linux distributions). Check the version with "perl -v"
    * 1GB of RAM.
    * 1 core (it only uses one core per job).
    * At least 1GB HDD.

# HOW TO RUN PHENO-RANKER

For executing pheno-ranker you will need a PXF or BFF file(s) in JSON format. The reference cohort must be a JSON array, where each individual data are consolidated in one object.

There are three modes of operation:

- Intra-cohort:

    With `--r` argument

- Patient:

    WIth `-r` reference cohort and `--t` patient data 

- Inter-cohort:

    With `--r` argument for reference cohort and `--t` for the target cohort and the flag --mode inter-cohort

**Examples:**

    $ ./pheno-ranker -r phenopackets.json  # mode intra-cohort

    $ ./pheno-ranker -r phenopackets.yaml -o my_matrix.txt # mode intra-cohort

    $ ./pheno-ranker -r phenopackets.json -w weights.yaml --exclude-terms sex ethnicity exposures # mode intra-cohort with weights

    $ $path/pheno-ranker -r individuals.json -t patient.yaml -max-out 100 # mode patient

    $ $path/pheno-ranker -cohorts individuals.json others.yaml --append-suffixes R T  # mode inter-cohort

## COMMON ERRORS AND SOLUTIONS

    * Error message: Foo
      Solution: Bar

    * Error message: Foo
      Solution: Bar

# AUTHOR 

Written by Manuel Rueda, PhD. Info about CNAG can be found at [https://www.cnag.crg.eu](https://www.cnag.crg.eu).

# COPYRIGHT AND LICENSE

This PERL file is copyrighted. See the LICENSE file included in this distribution.
