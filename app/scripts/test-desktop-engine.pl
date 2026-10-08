#!/usr/bin/env perl

use strict;
use warnings;
use Cwd qw(abs_path);
use File::Spec;
use File::Temp qw(tempdir);
use FindBin qw($Bin);

if ( @ARGV && $ARGV[0] eq '--probe' ) {
    no warnings 'once';
    require Config;
    $| = 1;
    for my $module (qw(IO::Socket::SSL Pheno::Ranker Mojolicious::Lite YAML::XS)) {
        print "Loading $module\n";
        ( my $file = "$module.pm" ) =~ s{::}{/}g;
        require $file;
    }
    die "Runtime is not relocatable\n"
      if $^O ne 'MSWin32' && !$Config::Config{userelocatableinc};
    die "Share lookup failed\n" unless -f File::Spec->catfile(
        $Pheno::Ranker::share_dir, 'conf', 'config.yaml' );
    die "Compiled metrics failed\n"
      unless Pheno::Ranker::Metrics::hd_fast( '01', '11' ) == 1;
    my $output = File::Spec->catfile( tempdir( CLEANUP => 1 ), 'matrix.txt' );
    system $^X, File::Spec->catfile( $ENV{PHENO_RANKER_ROOT}, 'bin', 'pheno-ranker' ),
      '--reference', File::Spec->catfile( $ENV{PHENO_RANKER_ROOT}, 't', 'data', 'individuals.json' ),
      '--out-file', $output, '--no-color';
    die "Packaged CLI smoke test failed\n" if $? != 0 || !-s $output;
    for my $dataset (qw(omim orpha)) {
        my $prefix = File::Spec->catfile($ENV{PHENO_RANKER_ROOT}, 'app', 'data', 'precomputed', $dataset, $dataset);
        die "Missing bundled labels for $dataset\n" unless -f "$prefix.labels.json.gz";
        system $^X, File::Spec->catfile($ENV{PHENO_RANKER_ROOT}, 'bin', 'pheno-ranker'),
          '--precomputed-ref-prefix', $prefix,
          '--target', File::Spec->catfile($ENV{PHENO_RANKER_ROOT}, 'app', 'engine', 'examples', 'patient.json'),
          '--include-terms', 'phenotypicFeatures', '--sort-by', 'jaccard', '--max-out', '5',
          '--out-file', "$output.$dataset", '--no-color';
        die "Packaged $dataset reference smoke test failed\n" if $? != 0 || !-s "$output.$dataset";
    }
    print "$Pheno::Ranker::VERSION\n";
    exit 0;
}

my $engine = abs_path( shift // die "Usage: $0 ENGINE_DIRECTORY\n" )
  or die "Cannot resolve engine directory\n";
my $perl = File::Spec->catfile( $engine, 'runtime', 'bin',
    $^O eq 'MSWin32' ? 'perl.exe' : 'perl' );
die "Staged Perl executable is missing\n" unless -f $perl;
my $helper = File::Spec->catfile( $engine, 'python',
    $^O eq 'MSWin32' ? 'pheno-ranker-helper.exe' : 'pheno-ranker-helper' );
die "Staged Python helper is missing\n" unless -f $helper;
my $home = tempdir(CLEANUP => 1);
local %ENV = (
    ( $^O eq 'MSWin32'
        ? ( SystemRoot => $ENV{SystemRoot}, WINDIR => $ENV{WINDIR},
            PATH => File::Spec->catdir( $engine, 'runtime', 'bin' ) )
        : () ),
    HOME => $home, USERPROFILE => $home,
    TMPDIR => $home, TEMP => $home, TMP => $home,
    PHENO_RANKER_ROOT       => $engine,
    PHENO_RANKER_SHARE_DIR  => File::Spec->catdir( $engine, 'share' ),
    PHENO_RANKER_INLINE_DIR => File::Spec->catdir( $engine, 'inline' ),
    ( $^O eq 'linux'
        ? ( LD_LIBRARY_PATH => File::Spec->catdir( $engine, 'runtime', 'lib' ) )
        : () ),
);
system $perl, '-I' . File::Spec->catdir( $engine, 'lib' ),
  abs_path(__FILE__), '--probe';
die "Cannot start relocated Perl: $!\n" if $? == -1;
die sprintf "Relocated engine smoke test failed (status %d)\n", $? if $? != 0;
system $perl, File::Spec->catfile($Bin, 'test-python-helper.pl'), '--helper', $helper;
die "Cannot start frozen Python smoke tests: $!\n" if $? == -1;
die sprintf "Frozen Python smoke tests failed (status %d)\n", $? if $? != 0;
