#!/usr/bin/env perl
use strict;
use warnings;
use File::Spec::Functions qw(catdir catfile);
use Test::More tests => 2;    # Indicate the number of tests you want to run
use File::Compare;

##########
# TEST 1 #
##########

{

    # The command line script to be tested
    my $script = catfile( 'utils', 'bff_pxf_plot', 'bff-pxf-plot' );

    # Input file for the command line script, if needed
    my $input_file = catfile( 't', 'individuals.json' );

    # The reference files to compare the output with
    my $reference_file = catfile( 't', 'plot', 'bff.png' );

    # The output files
    my $output_file = catfile( 't' , 'plot', 'bff_tmp.png' );

    # Run the command line
    system("$script -i $input_file -o $output_file");

    # Compare the output_file and the reference_file
    ok(
        compare( $output_file, $reference_file ) == 0,
        qq/Output matches the <$reference_file> file/
    );
    unlink $output_file;
}

{

    # The command line script to be tested
    my $script = catfile( 'utils', 'bff_pxf_plot', 'bff-pxf-plot' );

    # Input file for the command line script, if needed
    my $input_file = catfile( 't', 'pxf_random_100.json' );

    # The reference files to compare the output with
    my $reference_file = catfile( 't', 'plot', 'pxf.png' );

    # The output files
    my $output_file = catfile( 't' , 'plot', 'pxf_tmp.png' );

    # Run the command line
    system("$script -i $input_file -o $output_file");

    # Compare the output_file and the reference_file
    ok(
        compare( $output_file, $reference_file ) == 0,
        qq/Output matches the <$reference_file> file/
    );
    unlink $output_file;
}

