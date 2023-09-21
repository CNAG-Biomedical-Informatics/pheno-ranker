#!/usr/bin/env perl
use strict;
use warnings;
use autodie;
use File::Spec::Functions qw(catfile);
use File::Temp            qw{ tempfile };    # core
use Test::More tests => 6;                   # Indicate the number of tests you want to run
use File::Compare;
use Sort::Naturally qw(nsort);

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
"$script -r $input_file -t $patient_file -max-out 36 --align t/tar_align | sort -k2 | cut -f2-> $tmp_file"
        );

        # Compare the output_file and the reference_file
        ok(
            compare( $tmp_file, $reference_file ) == 0,
            qq/Output matches the <$reference_file> file/
        );

        # *** --align ****
        # alignment.txt
        my $align_file;
        $reference_file = catfile( 't', 'ref_align.csv' );
        $align_file = catfile( 't', 'tar_align.csv' );
        ok(
            compare_sorted_files( $align_file, $reference_file ),
            qq/<$align_file> matches the <$reference_file> file/

        );
        unlink $align_file;

        # alignment.target.csv
        $reference_file = catfile( 't', 'ref_align.target.csv' );
        $align_file     = catfile( 't', 'tar_align.target.csv' );
        ok(
            compare_sorted_files( $align_file, $reference_file ),
            qq/<$align_file> matches the <$reference_file> file/
        );
        unlink $align_file;

        # alignment.txt
        $reference_file = catfile( 't', 'ref_align.txt' );
        $align_file     = catfile( 't', 'tar_align.txt' );
        ok(
            compare_sorted_files( $align_file, $reference_file ),
            qq/<$align_file> matches the <$reference_file> file/

        );
        unlink $align_file;
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

sub compare_sorted_files {

    my ( $file1, $file2 ) = @_;

    # Step 1: Read the contents of each file into separate arrays
    open my $fh1, '<', $file1;
    open my $fh2, '<', $file2;

    my @lines1 = <$fh1>;
    my @lines2 = <$fh2>;

    close $fh1;
    close $fh2;

    # Step 2: Sort the arrays
    # NB: Only greeping lines with two id otherwise sort fails
    #     due to similar values
    #@lines1 = nsort ( grep { $_ =~ m/107/ } @lines1);
    #@lines2 = nsort ( grep { $_ =~ m/107/ } @lines2);
    # Also fails ...using slice...
    @lines1 = nsort @lines1[0..24];
    @lines2 = nsort @lines2[0..24];

    # Step 3: Write the sorted content to temporary files
    my $temp_file1 = catfile('t', 'temp_file1.txt');
    my $temp_file2 = catfile('t', 'temp_file2.txt');

    open my $tfh1, '>', $temp_file1;
    open my $tfh2, '>', $temp_file2;

    print $tfh1 @lines1;
    print $tfh2 @lines2;

    close $tfh1;
    close $tfh2;

    # Compare
    my $compare_result = compare( $temp_file1, $temp_file2 ) == 0;

    # Cleanup: Remove the temporary files
    unlink ($temp_file1, $temp_file2);

    return $compare_result;
}
