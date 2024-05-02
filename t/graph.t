#!/usr/bin/env perl
use strict;
use warnings;
use File::Spec::Functions qw(catfile);
use Test::More tests => 1;    # Indicate the number of tests you want to run
use File::Temp qw{ tempfile };    # core
use File::Compare;

# The command line script to be tested
my $script = catfile( 'bin', 'pheno-ranker' );
my $inc = join ' -I', '', @INC; # prepend -I to each path in @INC

############
# TEST 1 #
############

{
    # Input file for the command line script, if needed
    my $input_file = catfile( 't', 'individuals.json' );

    # The reference files to compare the output with
    my $reference_file   = catfile( 't', 'graph.json' );

    # The generated output file
     my ( undef, $tmp_file ) =
        tempfile( DIR => 't', SUFFIX => ".json", UNLINK => 1 );

    # Run the command line script with the input file, and redirect the output to the output_file
    system("$^X $inc $script -r $input_file --cytoscape-json $tmp_file");

    # Compare the output_file and the reference_file
    ok(
        compare( $tmp_file, $reference_file ) == 0,
        qq/Output matches the <$reference_file> file/
    );
}
