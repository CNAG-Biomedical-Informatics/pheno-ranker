#!/usr/bin/env perl
use strict;
use warnings;
use autodie;
use File::Spec::Functions qw(catfile);
use File::Temp            qw{ tempdir tempfile };    # core
use Test::More tests => 2;                   # Indicate the number of tests you want to run
use File::Compare;
use lib qw(./lib ../lib t/lib);
use Test::PhenoRanker qw(fixture);

#use Data::Dumper;

##########
# TEST 1 #
##########

use_ok('Pheno::Ranker') or exit;

# Input file for the command line script, if needed
my $input_file = fixture('individuals.json');

##########
# TEST 2 #
##########

# The reference file to compare the output with
my $poi            = '107:week_0_arm_1';
my $reference_file = catfile( 'xt', 'poi', "$poi.json" );
my $poi_out_dir    = tempdir( CLEANUP => 1 );
my $new_file       = catfile( $poi_out_dir, "$poi.json" );

# The generated output file
my ( undef, $tmp_file ) =
  tempfile( DIR => 't', SUFFIX => ".json", UNLINK => 1 );
my $align_basename = catfile( tempdir( CLEANUP => 1 ), 'tar_align' );

my $ranker = Pheno::Ranker->new(
    {
        "age"                       => 0,
        "align"                     => "",
        "align_basename"            => $align_basename,
        "append_prefixes"           => [],
        "exclude_terms"             => [],
        "include_terms"             => [],
        "log"                       => "",
        "max_out"                   => 36,
        "out_file"                  => $tmp_file,
        "patients_of_interest"      => [$poi],
        "poi_out_dir"               => $poi_out_dir,
        "reference_files"           => [$input_file],
    }
);

# Method 'run'
$ranker->run;

ok(
    compare( $new_file, $reference_file ) == 0,
    qq/Output matches the <$reference_file> file/
);
unlink($new_file)
