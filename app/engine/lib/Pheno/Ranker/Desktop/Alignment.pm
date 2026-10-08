package Pheno::Ranker::Desktop::Alignment;
use strict;
use warnings;
use Text::CSV_XS;
use JSON::XS ();
use Scalar::Util qw(looks_like_number);

sub read_pair {
    my ($file, $reference) = @_;
    die "Provide a reference ID\n" unless defined($reference) && !ref($reference) && length($reference) && $reference !~ /\0/;
    open my $fh, '<:encoding(UTF-8)', $file or die "Cannot open pair alignment\n";
    my $csv = Text::CSV_XS->new({binary => 1, sep_char => ';'});
    my $header = $csv->getline($fh) or die "The alignment has no readable header\n";
    my %column = map {$header->[$_] => $_} 0 .. $#$header;
    my @required = qw(id ref tar weight hamming-distance json-path label);
    die "The alignment is missing required columns\n" if grep {!exists $column{$_}} @required;
    my (@rows, $bytes);
    my $json = JSON::XS->new->utf8;
    while (my $values = $csv->getline($fh)) {
        next unless defined($values->[$column{id}]) && $values->[$column{id}] eq $reference;
        die "The pair alignment contains incomplete rows\n" if grep {!defined $values->[$column{$_}]} @required;
        my $distance = $values->[$column{'hamming-distance'}];
        die "Invalid distance in pair alignment\n" unless looks_like_number($distance) && $distance !~ /nan|inf/i;
        my $path = $values->[$column{'json-path'}];
        my $row = {ref => $values->[$column{ref}], tar => $values->[$column{tar}],
            weight => $values->[$column{weight}], distance => 0 + $distance,
            path => $path, label => $values->[$column{label}], entity => (split /\./, $path)[0] || 'other'};
        # Bound only the selected pair, not the full cohort alignment on disk.
        $bytes += length($json->encode($row)) + 1;
        die "This pair exceeds the viewer limit (20,000 terms or 16 MiB). Save the alignment to inspect it externally.\n"
          if @rows >= 20_000 || $bytes > 16 * 1024 * 1024;
        push @rows, $row;
    }
    my ($code) = $csv->error_diag;
    die "Malformed alignment CSV\n" if $code && $code != 2012;
    close $fh or die "Cannot finish reading pair alignment\n";
    return {rows => \@rows};
}

1;
