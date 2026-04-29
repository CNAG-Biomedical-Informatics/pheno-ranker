#!/usr/bin/env perl
use strict;
use warnings;
use File::Spec::Functions qw(catfile);
use Test::More tests => 2;        # Indicate the number of tests you want to run
use File::Compare;
use lib qw(./lib ../lib t/lib);
use Test::PhenoRanker qw(fixture temp_output_file);

# The command line script to be tested
my $script = catfile( 'bin', 'pheno-ranker' );
my $inc    = join ' -I', '', @INC;    # prepend -I to each path in @INC

############
# TEST 1-2 #
############

{
    # Input file for the command line script, if needed
    my $input_file = fixture('individuals.json');

    # The reference files to compare the output with
    my $reference_file1 = fixture('graph.json');
    my $reference_file2 = fixture('graph_stats.txt');

    # The generated output files
    my $tmp_file1 = temp_output_file();
    my $tmp_file2 = temp_output_file( suffix => '.txt' );

    # Run the command line script with the input file, and redirect the output to the output_file
    system(
"$^X $inc $script -r $input_file --cytoscape-json $tmp_file1 --graph-stats $tmp_file2"
    );

    # Compare the output_file and the reference_file
    ok(
        compare( $tmp_file1, $reference_file1 ) == 0,
        qq/Output matches the <$reference_file1> file/
    );

    # Compare the output_file and the reference_file
    ok(
        compare( $tmp_file2, $reference_file2 ) == 0,
        qq/Output matches the <$reference_file2> file/
    );

}
