#!/usr/bin/env perl
use strict;
use warnings;

use File::Temp qw{ tempfile };    # core
use Test::More tests => 4; # Indicate the number of tests you want to run
use File::Compare;

# The command line script to be tested
my $script = 'bin/pheno-ranker';

##########
# TEST 1 #
##########

{
# Input file for the command line script, if needed
my $input_file = 't/movies.json';

# The reference file to compare the output with
my $reference_file = 't/ref_movies_matrix.txt';

my $config = 't/movies_config.yaml';

# The generated output file
my ( undef, $tmp_file ) =
      tempfile( DIR => 't', SUFFIX => ".json", UNLINK => 1 );

# Run the command line script with the input file, and redirect the output to the output_file
system("$script -r $input_file -o $tmp_file --config $config");

# Compare the output_file and the reference_file
ok( compare( $tmp_file, $reference_file ) == 0,  qq/Output matches the <$reference_file> file/);
}

##########
# TEST 2 #
##########

{
# Input file for the command line script, if needed
my $input_file = 't/movies.json';

# The reference file to compare the output with
my $reference_file = 't/ref_movies_include_matrix.txt';

my $config = 't/movies_config.yaml';

# The generated output file
my ( undef, $tmp_file ) =
      tempfile( DIR => 't', SUFFIX => ".json", UNLINK => 1 );

# Run the command line script with the input file, and redirect the output to the output_file
system("$script -r $input_file -o $tmp_file --config $config --include-terms country year");

# Compare the output_file and the reference_file
ok( compare( $tmp_file, $reference_file ) == 0,  qq/Output matches the <$reference_file> file/);
}

##########
# TEST 3 #
##########

{
# Input file for the command line script, if needed
my $input_file = 't/movies.json';

# The reference file to compare the output with
my $reference_file = 't/ref_movies_weights_matrix.txt';

my $config = 't/movies_config.yaml';

my $weights = 't/movies_weights.yaml';

# The generated output file
my ( undef, $tmp_file ) =
      tempfile( DIR => 't', SUFFIX => ".json", UNLINK => 1 );

# Run the command line script with the input file, and redirect the output to the output_file
system("$script -r $input_file -o $tmp_file --config $config -w $weights");

# Compare the output_file and the reference_file
ok( compare( $tmp_file, $reference_file ) == 0,  qq/Output matches the <$reference_file> file/);
}

##########
# TEST 4 #
##########

{
# Input file for the command line script, if needed
my $input_file = 't/cars.json';

# The reference file to compare the output with
my $reference_file = 't/cars_matrix.txt';

my $config = 't/cars_config.yaml';

# The generated output file
my ( undef, $tmp_file ) =
      tempfile( DIR => 't', SUFFIX => ".json", UNLINK => 1 );

# Run the command line script with the input file, and redirect the output to the output_file
system("$script -r $input_file -o $tmp_file --config $config");

# Compare the output_file and the reference_file
ok( compare( $tmp_file, $reference_file ) == 0,  qq/Output matches the <$reference_file> file/);
}

