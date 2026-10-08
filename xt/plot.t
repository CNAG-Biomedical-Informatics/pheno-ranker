#!/usr/bin/env perl
use strict;
use warnings;
use File::Spec::Functions qw(catfile);
use File::Temp qw(tempdir);
use Test::More;
use lib qw(./lib ../lib t/lib);
use Test::PhenoRanker qw(fixture);

my $script  = catfile( 'utils', 'bff_pxf_plot', 'bff-pxf-plot' );
my $tmp_dir = tempdir( CLEANUP => 1 );

for my $case (
    {
        name      => 'BFF',
        input     => fixture('individuals.json'),
    },
    {
        name      => 'PXF',
        input     => fixture('pxf_random_100.json'),
    },
) {
    subtest "$case->{name} plot" => sub {
        my $output = catfile( $tmp_dir, lc($case->{name}) . '.html' );

        is(
            system( $script, '-i', $case->{input}, '-o', $output ),
            0,
            'plot command succeeds',
        );

        open my $fh, '<:encoding(UTF-8)', $output or die "Cannot read $output: $!";
        local $/;
        my $html = <$fh>;
        like($html, qr/Q1 \(25%\)/, 'annotation-depth summary with quartiles');
        like($html, qr/Excluded phenotypes/, 'excluded annotations separated');
        like($html, qr/Filter terms/, 'searchable full term tables');
    };
}

subtest 'self-contained HTML report' => sub {
    my $output = catfile( $tmp_dir, 'pxf.html' );
    is(
        system( $script, '-i', fixture('pxf_random_100.json'), '-o', $output ),
        0,
        'HTML report command succeeds',
    );
    open my $fh, '<:encoding(UTF-8)', $output or die "Cannot read $output: $!";
    local $/;
    my $document = <$fh>;
    like( $document, qr/\A<!doctype html>/, 'output is an HTML document' );
    like( $document, qr{data:image/svg\+xml;base64,}, 'vector plots are embedded in the report' );
    unlike( $document, qr{(?:src|href)=["']https?://}, 'report has no remote assets' );
    my @charts = $document =~ /class="chart-image"/g;
    is(scalar @charts, 9, 'PXF report includes the unique-descriptor distribution without empty panels');
    like($document, qr/No entries in any record/, 'empty sections are listed compactly');
    like($document, qr/class="report-logo" src="data:image\/svg\+xml;base64,/, 'logo is embedded, not externally linked');
};

done_testing;
