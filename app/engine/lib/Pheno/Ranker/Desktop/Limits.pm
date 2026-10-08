package Pheno::Ranker::Desktop::Limits;
use strict;
use warnings;
use Exporter 'import';
use JSON::XS ();
use Path::Tiny qw(path);
our @EXPORT_OK=qw(limits);
my $defaults=JSON::XS->new->decode(path(__FILE__)->absolute->parent(5)->child('limits.json')->slurp_raw);
sub limits {
    my ($values)=@_;
    $values={} unless defined $values;
    die "Limits must be an object\n" unless ref($values) eq 'HASH';
    die "Unknown limit setting\n" if grep {!exists $defaults->{$_}} keys %$values;
    for my $key (keys %$values) {
        my $value=$values->{$key};
        die "Limit $key must be a positive integer\n" unless defined($value) && !ref($value)
          && "$value" =~ /\A[1-9]\d*\z/ && $value<=2147483647;
    }
    return {%$defaults,map {$_=>0+$values->{$_}} keys %$values};
}
1;
