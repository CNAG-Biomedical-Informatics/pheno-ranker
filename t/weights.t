#!/usr/bin/env perl
use strict;
use warnings;
use lib ( './lib', '../lib' );
#use feature               qw(say);
#use File::Spec::Functions qw(catdir catfile);
use Test::Exception tests => 2;
use Pheno::Ranker;

my %err = (
    '1' => 'Expected integer - got string',
    '2' => 'Properties not allowed: foo'
    #    '3' => 'expected array got string',
    #    '4' => 'radio property is not nested',
    #    '5' => 'value not allowed for project.source',
    #    '6' => 'invalid ontology'
);

for my $err ( keys %err ) {
    my $ranker = Pheno::Ranker->new(
        {
            reference_file => 't/individuals.json',
            weights_file   => qq(t/weights_err$err.yaml),
            config_file => undef
        }
    );
    dies_ok { $ranker->run }
    'expecting to die by error: ' . $err{$err};
}
