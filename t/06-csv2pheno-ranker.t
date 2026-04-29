#!/usr/bin/env perl
use strict;
use warnings;
use File::Spec::Functions qw(catfile);
use File::Temp qw(tempdir);
use Test::More tests => 2;    # Indicate the number of tests you want to run
use File::Compare;
use lib qw(./lib ../lib t/lib);
use Test::PhenoRanker qw(fixture);

# The command line script to be tested
my $script = catfile( 'utils', 'csv2pheno_ranker', 'csv2pheno-ranker' );
my $inc = join ' -I', '', @INC; # prepend -I to each path in @INC

############
# TEST 1-2 #
############

{
    # Input file for the command line script, if needed
    my $input_file = fixture('example.csv');

    # The reference files to compare the output with
    my $reference_file   = fixture('example_ref.json');
    my $reference_config = fixture('example_config_ref.yaml');

    # The exppected output files from csv2pheno-ranker 
    my $output_dir = tempdir( CLEANUP => 1 );
    my $file       = catfile( $output_dir, 'example.json' );
    my $config     = catfile( $output_dir, 'example_config.yaml' );

    # Run the command line script with the input file, and redirect the output to the output_file
    system("$^X $inc $script -i $input_file --output-dir $output_dir -sep ';' --generate-primary-key --primary-key-name Id --array-separator ','");

    # Compare the output_file and the reference_file
    ok(
        compare( $file, $reference_file ) == 0,
        qq/Output matches the <$reference_file> file/
    );
    ok(
        compare( $config, $reference_config ) == 0,
        qq/Output matches the <$reference_config> file/
    );
}
