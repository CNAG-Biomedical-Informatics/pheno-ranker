#!/usr/bin/env perl
use strict;
use warnings;
use YAML::XS qw(DumpFile);
use lib ".";

# Assuming Ontologies.pm is in the same directory or in a directory in @INC
use Ontologies
  qw($hpo_array $omim_array $rxnorm_array $ncit_procedures_array $ncit_exposures_array $ethnicity_array);

# Convert these arrays into a hash with keys corresponding to your YAML structure
my $n    = 5;
my $data = {
    phenotypicFeatures => [ @$hpo_array[ 0 .. $n ] ],
    diseases           => [ @$omim_array[ 0 .. $n ] ],
    treatments         => [ @$rxnorm_array[ 0 .. $n ] ],
    procedures         => [ @$ncit_procedures_array[ 0 .. $n ] ],
    exposures          => [ @$ncit_exposures_array[ 0 .. $n ] ]
    #ethnicity => $ethnicity_array
};

# Write YAML
DumpFile( 'ontologies.yaml', $data );

