# NAME

create\_random\_bff\_pxf.pl: A script that creates a JSON array of random BFF/PXF

# SYNOPSIS

create\_random\_bff\_pxf.pl -r &lt;individuals.json> -t &lt;patient.json> \[-options\]

     Options:

       -diseases                      Number of [1]
       -phenotypicFeatures            Number of [3]
       -treatments                    Number of [3]

       -debug                         Print debugging (from 1 to 5, being 5 max)
       -f                             Format [>bff|pxf]
       -h|help                        Brief help message
       -n                             Number of individuals
       -man                           Full documentation
       -o                             Output file [individuals.json]
       -v|verbose                     Verbosity on
       -V|version                     Print version

# DESCRIPTION

A script that creates a JSON array of random BFF/PXF

# SUMMARY

A script that creates a JSON array of random BFF/PXF

# INSTALLATION

    $ cpanm sudo --installdeps .

### System requirements

    * Ideally a Debian-based distribution (Ubuntu or Mint), but any other (e.g., CentOs, OpenSuse) should do as well.
    * Perl 5 (>= 5.10 core; installed by default in most Linux distributions). Check the version with "perl -v"
    * 1GB of RAM.
    * 1 core (it only uses one core per job).
    * At least 1GB HDD.

# HOW TO RUN CREATE-RANDOM-BFF-PXF

The software runs without any argument and assumes defaults. If you want to change some pearmeters please take a look to the synopsis

**Examples:**

    $ ./create_random_bff_pxf.pl -f pxf  # BFF with 100 samples

    $ ./create_random_bff_pxf.pl -f pxf -n 1000 -o pxf.json # PXF with 1K samples and saved to pxf.json

    $ ./create_random_bff_pxf.pl -phenotypicFeatures 10 # BFF with 100 samples and 10 pF each

## COMMON ERRORS AND SOLUTIONS

    * Error message: Foo
      Solution: Bar

    * Error message: Foo
      Solution: Bar

# AUTHOR 

Written by Manuel Rueda, PhD. Info about CNAG can be found at [https://www.cnag.crg.eu](https://www.cnag.crg.eu).

# COPYRIGHT AND LICENSE

This PERL file is copyrighted. See the LICENSE file included in this distribution.
