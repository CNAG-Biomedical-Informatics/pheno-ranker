#!/usr/bin/env perl
use strict;
use warnings;
use IPC::Open3;
use File::Spec::Functions qw(catdir catfile);
use File::Temp qw(tempdir);
use Test::More;
use File::Compare;
use lib qw(./lib ../lib t/lib);
use Test::PhenoRanker qw(fixture);

##########
# TEST 1 #
##########
SKIP: {
    skip "Skipping PNG comparison tests on macOS", 1 if $^O eq 'darwin'; # mrueda 01/17/25

    {
        # The command line script to be tested
        my $script = catfile( 'utils', 'barcode', 'pheno-ranker2barcode' );

        # Input file for the command line script, if needed
        my $input_file = fixture('export.ref_binary_hash.json');

        # The reference files to compare the output with
        my $reference_file = fixture( 'qr_codes', '107_week_0_arm_1.png' );

        # The output files
        my $output_dir  = tempdir( CLEANUP => 1 );
        my $output_file = catfile( $output_dir, '107_week_0_arm_1.png' );

        # Run the command line
        system("$script -i $input_file -o $output_dir --no-compress");

        # Compare the output_file and the reference_file
        ok(
            compare( $output_file, $reference_file ) == 0,
            qq/Output matches the <$reference_file> file/
        );
    }
}

##########
# TEST 2 #
##########
SKIP: {
    skip "Skipping PNG comparison tests on macOS", 1 if $^O eq 'darwin';

    {
        # The command line script to be tested
        my $script = catfile( 'utils', 'barcode', 'barcode2pheno-ranker' );

        # Input file for the command line script, if needed
        my $input_file    = fixture( 'qr_codes', '107_week_0_arm_1.png' );
        my $template_file = fixture('export.glob_hash.json');

        # The reference files to compare the output with
        my $reference_file = fixture( 'qr_codes', 'output.json' );

        # The output files
        my $output_dir  = tempdir( CLEANUP => 1 );
        my $output_file = catfile( $output_dir, 'new_output.json' );

        # Run the command line
        system("$script -i $input_file -t $template_file -o $output_file");

        # Compare the output_file and the reference_file
        ok(
            compare( $output_file, $reference_file ) == 0,
            qq/Output matches the <$reference_file> file/
        );
    }
}

##########
# TEST 3 #
##########
SKIP: {

    {
        # The command line script to be tested
        my $script = catfile( 'utils', 'barcode', 'pheno-ranker2pdf' );

        # Input file for the command line script, if needed
        my $qr   = fixture( 'qr_codes', '107_week_0_arm_1.png' );
        my $logo = catfile( 'docs-site', 'static', 'img', 'PR-logo.png' );
        my $json = fixture( 'qr_codes', 'output.json' );

        # The output files
        my $output_dir  = tempdir( CLEANUP => 1 );
        my $output_file = catfile( $output_dir, '107_week_0_arm_1.pdf' );

        # Run the command line
        is(system($script, '-j', $json, '-l', $logo, '-q', $qr,
                  '-o', $output_dir, '-t', 'bff', '--test'), 0,
           'PDF command succeeds');
        open my $pdf, '<:raw', $output_file or die "Cannot read $output_file: $!";
        local $/;
        my $content = <$pdf>;
        like($content, qr/\A%PDF-/, 'output has a PDF header');
        like($content, qr/%%EOF\s*\z/, 'PDF is complete');
    }
}

##########
# TEST 4 #
##########
SKIP: {
    skip "Skipping PNG comparison tests on macOS", 1 if $^O eq 'darwin';

    {
        # The command line script to be tested
        my $script = catfile( 'utils', 'barcode', 'pheno-ranker2barcode' );

        # Input file for the command line script, if needed
        my $input_file = fixture('export.ref_binary_hash.json');

        # The reference files to compare the output with
        my $reference_file = fixture( 'qr_codes', '107_week_0_arm_1.compressed.png' );

        # The output files
        my $output_dir  = tempdir( CLEANUP => 1 );
        my $output_file = catfile( $output_dir, '107_week_0_arm_1.png' );

        # Run the command line
        system("$script -i $input_file -o $output_dir");

        # Compare the output_file and the reference_file
        ok(
            compare( $output_file, $reference_file ) == 0,
            qq/Output matches the <$reference_file> file/
        );
    }
}

##########
# TEST 5 #
##########
SKIP: {
    skip "Skipping PNG comparison tests on macOS", 1 if $^O eq 'darwin';

    {
        # The command line script to be tested
        my $script = catfile( 'utils', 'barcode', 'barcode2pheno-ranker' );

        # Input file for the command line script, if needed
        my $input_file    = fixture( 'qr_codes', '107_week_0_arm_1.compressed.png' );
        my $template_file = fixture('export.glob_hash.json');

        # The reference files to compare the output with
        my $reference_file = fixture( 'qr_codes', 'output.compressed.json' );

        # The output files
        my $output_dir  = tempdir( CLEANUP => 1 );
        my $output_file = catfile( $output_dir, 'new_output.json' );

        # Run the command line
        system("$script -i $input_file -t $template_file -o $output_file");

        # Compare the output_file and the reference_file
        ok(
            compare( $output_file, $reference_file ) == 0,
            qq/Output matches the <$reference_file> file/
        );
    }
}

##########
# TEST 6 #
##########
SKIP: {
    skip "Skipping PNG comparison tests on macOS", 1 if $^O eq 'darwin';

    {
        # The command line script to be tested
        my $script = catfile( 'utils', 'barcode', 'barcode2pheno-ranker' );

        # Pass a literal glob so expansion is handled by Python, not the shell.
        my $input_glob    = catfile( 't', 'data', 'qr_codes', '107_week_0_arm_1.compressed.*' );
        my $template_file = fixture('export.glob_hash.json');

        # The reference files to compare the output with
        my $reference_file = fixture( 'qr_codes', 'output.compressed.json' );

        # The output files
        my $output_dir  = tempdir( CLEANUP => 1 );
        my $output_file = catfile( $output_dir, 'new_output.json' );

        # Run the command line without shell glob expansion
        system( $script, '-i', $input_glob, '-t', $template_file, '-o', $output_file );

        # Compare the output_file and the reference_file
        ok(
            compare( $output_file, $reference_file ) == 0,
            'Python-side PNG glob expansion decodes compressed QR files'
        );
    }
}

##########
# TEST 7 #
##########
{
    my $script     = catfile( 'utils', 'barcode', 'pheno-ranker2barcode' );
    my $input_file = fixture('export.ref_binary_hash.json');
    my $output_dir = tempdir( CLEANUP => 1 );

    my $exit = run_quietly(
        $script, '-i', $input_file, '-o', $output_dir,
        '--qr-version', 41
    );
    isnt( $exit, 0, 'invalid QR version is rejected' );
}

done_testing;

sub run_quietly {
    open my $null_in,  '<', File::Spec->devnull;
    open my $null_out, '>', File::Spec->devnull;
    open my $null_err, '>', File::Spec->devnull;
    my $pid = open3( $null_in, $null_out, $null_err, @_ );
    waitpid $pid, 0;
    return $?;
}
