#!/usr/bin/env perl
use strict;
use warnings;
use File::Spec::Functions qw(catfile);
use File::Temp            qw{ tempfile };    # core
use Test::More tests => 3;                   # Indicate the number of tests you want to run
use File::Compare;

use constant IS_WINDOWS => ( $^O eq 'MSWin32' || $^O eq 'cygwin' ) ? 1 : 0;

# The command line script to be tested
my $script = catfile( './bin', 'pheno-ranker' );

# Input file for the command line script, if needed
my $input_file = catfile( 't', 'individuals.json' );

SKIP: {
    # Linux commands don't run on windows
    skip qq{Sipping WIn32 tests}, 3 if IS_WINDOWS;

    ##########
    # TEST 1 #
    ##########

    {
        # The reference file to compare the output with
        my $reference_file = catfile( 't', 'matrix_ref.txt' );

        # The generated output file
        my ( undef, $tmp_file ) =
          tempfile( DIR => 't', SUFFIX => ".json", UNLINK => 1 );

        # Run the command line script with the input file, and redirect the output to the output_file
        system("$script -r $input_file -o $tmp_file");

        # Compare the output_file and the reference_file
        ok(
            compare( $tmp_file, $reference_file ) == 0,
            qq/Output matches the <$reference_file> file/
        );
    }

    ##########
    # TEST 2 #
    ##########

    {
        my $patient_file   = catfile( 't', 'patient.json' );
        my $reference_file = catfile( 't', 'rank_ref_sorted.txt' );

        # The generated output file
        my ( undef, $tmp_file ) =
          tempfile( DIR => 't', SUFFIX => ".json", UNLINK => 1 );

        # Run the command line script with the input file, and redirect the output to the output_file
        system(
"$script -r $input_file -t $patient_file --align | sort -k2 | cut -f2-> $tmp_file"
        );

        # Compare the output_file and the reference_file
        ok(
            compare( $tmp_file, $reference_file ) == 0,
            qq/Output matches the <$reference_file> file/
        );

        # Compare with the 3 x --align files
        $reference_file =  'alignment_ref.csv';
         ok(
            compare( 'alignment.txt', $reference_file ) == 0,
            qq/Output matches the <$reference_file> file/
        );

          $reference_file =  'alignment_ref.target.csv';
         ok(
            compare( 'alignment.target.csv', $reference_file ) == 0,
            qq/Output matches the <$reference_file> file/
        );

         $reference_file = 'alignment_ref.txt';
        ok(
            compare( 'alignment.txt', $reference_file ) == 0,
            qq/Output matches the <$reference_file> file/
        );

    }

    ##########
    # TEST 3 #
    ##########

    {
        my $patient_file   = catfile( 't', 'patient.json' );
        my $reference_file = catfile( 't', 'rank_weight_ref_sorted.txt' );
        my $weights_file   = catfile( 't', 'weights.yaml' );

        # The generated output file
        my ( undef, $tmp_file ) =
          tempfile( DIR => 't', SUFFIX => ".json", UNLINK => 1 );

        # Run the command line script with the input file, and redirect the output to the output_file
        system(
"$script -r $input_file -t $patient_file -w $weights_file | sort -k2 | cut -f2-> $tmp_file"
        );

        # Compare the output_file and the reference_file
        ok(
            compare( $tmp_file, $reference_file ) == 0,
            qq/Output matches the <$reference_file> file/
        );
    }

}
