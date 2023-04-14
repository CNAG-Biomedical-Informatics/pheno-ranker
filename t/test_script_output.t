#!/usr/bin/env perl
use strict;
use warnings;

use File::Temp qw{ tempfile };    # core
use Test::More tests => 2; # Indicate the number of tests you want to run
use File::Compare;

# The command line script to be tested
my $script = './pheno-ranker';

# Input file for the command line script, if needed
my $input_file = 't/individuals.json';

##########
# TEST 1 #
##########

# The reference file to compare the output with
{
my $reference_file = 't/matrix_ref.txt';

# The generated output file
my ( undef, $tmp_file ) =
      tempfile( DIR => 't', SUFFIX => ".json", UNLINK => 1 );

# Run the command line script with the input file, and redirect the output to the output_file
system("$script -r $input_file -o $tmp_file");

# Compare the output_file and the reference_file
ok( compare( $tmp_file, $reference_file ) == 0,  qq/Output matches the <$reference_file> file/);
}

##########
# TEST 2 #
##########

{
my $patient_file = 't/patient.json';
my $reference_file = 't/rank_ref_sorted.txt';

# The generated output file
my ( undef, $tmp_file ) =
      tempfile( DIR => 't', SUFFIX => ".json", UNLINK => 1 );

# Run the command line script with the input file, and redirect the output to the output_file
system("$script -r $input_file -t $patient_file | sort > $tmp_file");

# Compare the output_file and the reference_file
ok( compare( $tmp_file, $reference_file ) == 0,  qq/Output matches the <$reference_file> file/);
}
