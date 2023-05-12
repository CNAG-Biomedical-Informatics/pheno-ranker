# NAME

pheno-ranker: A script that compares a given BFF/PXF file against a BFF/PXF cohort

# SYNOPSIS

pheno-ranker -r &lt;individuals.json> -t &lt;patient.json> \[-options\]

     Arguments:                       
       -r|reference-file              BFF/PXF file (JSON array)
       -t|target-file                 BFF/PXF file (JSON or JSON array with 1 object)

     Options:
       -age                           Include age-related variables [>no-age|age]
       -debug                         Print debugging (from 1 to 5, being 5 max)
       -e|export                      Export miscellanea JSON files
       -exclude-terms                 Exclude BFF/PXF terms (e.g., --exclude-terms sex id)
       -h|help                        Brief help message
       -hpo                           Include HPO ascendant terms (if present)
       -include-terms                 Include BFF/PXF terms (e.g., --ixclude-terms diseases)
       -log                           Save log file (JSON). If no argument is given then the log is named [pheno-ranker-log.json]
       -man                           Full documentation
       -max-out                       Print only N of comparisons (used with --t)  [50]
       -no-color                      Don't print colors to STDOUT [>color|no-color]
       -o                             Output file [matrix.txt]
       -sort-by                       Sort reference-patient comparison by Hamming-distance or Jaccard-index [>hamming|jaccard]
       -v|verbose                     Verbosity on
       -V|version                     Print version
       -w|weights                     YAML file with weights

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

For executing pheno-ranker you will need:

- Input file(s):

    A PXF or BFF file(s) in JSON format. The reference cohort must be a JSON array, where each individual data are consolidated in one object. 

    If no `--t` argument is provided then it will compute intra-cohort comparison only. If `--t` argument is provided then the target JSON will be compared against the `-r` reference cohort.

**Examples:**

    $ ./pheno-ranker -r phenopackets.json  # intra-cohort

    $ ./pheno-ranker -r phenopackets.json -o my_matrix.txt # intra-cohort

    $ ./pheno-ranker -r phenopackets.json -w weights.yaml --exclude-terms sex ethnicity exposures # intra-cohort with weights

    $ $path/pheno-ranker -t patient.json -r individuals.json -max-out 100 # patient-cohort

## COMMON ERRORS AND SOLUTIONS

    * Error message: Foo
      Solution: Bar

    * Error message: Foo
      Solution: Bar

# AUTHOR 

Written by Manuel Rueda, PhD. Info about CNAG can be found at [https://www.cnag.crg.eu](https://www.cnag.crg.eu).

# COPYRIGHT AND LICENSE

This PERL file is copyrighted. See the LICENSE file included in this distribution.
