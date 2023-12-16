#!/usr/bin/env perl
use strict;
use warnings;
use File::Spec::Functions qw(catdir catfile);
use Test::More tests => 3;    # Indicate the number of tests you want to run
use File::Compare;
use List::MoreUtils qw(pairwise);

##########
# TEST 1 #
##########

{

    # The command line script to be tested
    my $script = catfile( 'utils', 'barcode', 'pheno-ranker2barcode' );

    # Input file for the command line script, if needed
    my $input_file = catfile( 't', 'export.ref_binary_hash.json' );

    # The reference files to compare the output with
    my $reference_file = catfile( 't', 'qr_codes', '107_week_0_arm_1.png' );

    # The output files
    my $output_dir  = catdir( 't', 'tmp_test' );
    my $output_file = catfile( $output_dir, '107_week_0_arm_1.png' );

    # Run the command line
    system("$script -i $input_file -o $output_dir --no-compress");

    # Compare the output_file and the reference_file
    ok(
        compare( $output_file, $reference_file ) == 0,
        qq/Output matches the <$reference_file> file/
    );
    unlink $output_file;
    rmdir $output_dir;
}

##########
# TEST 2 #
##########

{

    # The command line script to be tested
    my $script = catfile( 'utils', 'barcode', 'barcode2pheno-ranker' );

    # Input file for the command line script, if needed
    my $input_file    = catfile( 't', 'qr_codes', '107_week_0_arm_1.png' );
    my $template_file = catfile( 't', 'export.glob_hash.json' );

    # The reference files to compare the output with
    my $reference_file = catfile( 't', 'qr_codes', 'output.json' );

    # The output files
    my $output_dir  = catdir( 't', 'qr_codes' );
    my $output_file = catfile( $output_dir, 'new_output.json' );

    # Run the command line
    system("$script -i $input_file -t $template_file -o $output_file");

    # Compare the output_file and the reference_file
    ok(
        compare( $output_file, $reference_file ) == 0,
        qq/Output matches the <$reference_file> file/
    );
    unlink($output_file);
}

##########
# TEST 3 #
##########

{

    # The command line script to be tested
    my $script = catfile( 'utils', 'barcode', 'pheno-ranker2pdf' );

    # Input file for the command line script, if needed
    my $qr   = catfile( 't',    'qr_codes', '107_week_0_arm_1.png' );
    my $logo = catfile( 'docs', 'img',      'PR-logo.png' );
    my $json = catfile( 't',    'qr_codes', 'output.json' );

    # The reference files to compare the output with
    my $reference_file = catfile( 't', 'qr_codes', '107_week_0_arm_1.pdf' );

    # The output files
    my $output_dir  = catdir( 't', 'tmp_test' );
    my $output_file = catfile( $output_dir, '107_week_0_arm_1.pdf' );

    # Run the command line
    system("$script -j $json -l $logo -q $qr -o $output_dir -t bff --test");

    # Compare the output_file and the reference_file
    ok(
        compare_files( $output_file, $reference_file ),
        qq/<$output_file> matches the <$reference_file> file/

    );
    unlink $output_file;
    rmdir $output_dir;
}

##########
# TEST 4 #
##########

#{
##
#    # The command line script to be tested
#    my $script = catfile( 'utils', 'barcode', 'pheno-ranker2barcode' );
#
#    # Input file for the command line script, if needed
#    my $input_file = catfile( 't', 'export.ref_binary_hash.json' );
#
#    # The reference files to compare the output with
#    my $reference_file = catfile( 't', 'qr_codes', '107_week_0_arm_1.compressed.png' );
#
#    # The output files
#    my $output_dir  = catdir( 't', 'tmp_test' );
#    my $output_file = catfile( $output_dir, '107_week_0_arm_1.compressed.png' );
#
#    # Run the command line
#    system("$script -i $input_file -o $output_dir");
#
#    # Compare the output_file and the reference_file
#    ok(
#        compare( $output_file, $reference_file ) == 0,
#        qq/Output matches the <$reference_file> file/
#    );
#    unlink $output_file;
#    rmdir $output_dir;
#}


sub compare_files {

    my ( $file1, $file2 ) = @_;

    open my $fh1, '<', $file1;
    open my $fh2, '<', $file2;

    my @lines1 = grep { $_ !~ /CreationDate|ModDate|<\w{32}>/ } <$fh1>;
    my @lines2 = grep { $_ !~ /CreationDate|ModDate|<\w{32}>/ } <$fh2>;

    close $fh1;
    close $fh2;

    # Compare arrays directly
    return scalar @lines1 == scalar @lines2 && pairwise { $a eq $b } @lines1,
      @lines2;
}
