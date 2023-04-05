# NAME

pheno-ranker: A script that compares a given BFF/PXF file against a BFF/PXF cohort

# SYNOPSIS

pheno-ranker -r &lt;individuals.json> -t &lt;patient.json> \[-options\]

     Arguments:                       
       -r|reference-file              BFF/PXF file (JSON array)
       -t|target-file                 BFF/PXF file (JSON)

     Options:
       -o                             Output file [matrix.txt]
       -debug                         Print debugging (from 1 to 5, being 5 max)
       -e|export                      Export miscellaena JSON files
       -h|help                        Brief help message
       -man                           Full documentation
       -nc|-no-color                  Don't print colors to STDOUT
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
    * 500MB of RAM.
    * 1 core (it only uses one core per job).
    * At least 1GB HDD.

# HOW TO RUN PHENO-RANKER

For executing pheno-ranker you will need:

- Input file(s):

    A PXF or BFF file(s) in JSON format. If no `--t` argument is provided then it will compute intra-cohort comparison only. If `--t` argument is provided then the target JSON will be compared agaisnt the `-r` reference JSON.

**Examples:**

    $ pheno-ranker -r phenopackets.json  # intra-cohort

    $ $path/pheno-ranker -t patient.json -r individuals.json # patient-cohort

## COMMON ERRORS AND SOLUTIONS

    * Error message: Foo
      Solution: Bar

    * Error message: Foo
      Solution: Bar

# AUTHOR 

Written by Manuel Rueda, PhD. Info about CNAG can be found at [https://www.cnag.crg.eu](https://www.cnag.crg.eu).

# COPYRIGHT AND LICENSE

This PERL file is copyrighted. See the LICENSE file included in this distribution.
