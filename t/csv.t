#!/usr/bin/env perl
use strict;
use warnings;

use Test::More tests => 2;    # Indicate the number of tests you want to run
use File::Compare;

# The command line script to be tested
my $script = './utils/csv2pheno-ranker/csv2pheno_ranker';

############
# TEST 1-2 #
############

{
    # Input file for the command line script, if needed
    my $input_file = 't/example.csv';

    # The reference files to compare the output with
    my $reference_file   = 't/example_ref.json';
    my $reference_config = 't/example_config_ref.yaml';

    my $file = 't/example.json';
    my $config = 't/example_config.yaml';

    # Run the command line script with the input file, and redirect the output to the output_file
    system(
        "$script -i $input_file -sep ';' --set-primary-key --primary-key Id");

    # Compare the output_file and the reference_file
    ok(
        compare( $file, $reference_file ) == 0,
        qq/Output matches the <$reference_file> file/
    );
    ok(
        compare( $config, $reference_config ) == 0,
        qq/Output matches the <$reference_config> file/
    );
    unlink($file, $config);
}
