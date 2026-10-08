package Pheno::Ranker::Desktop::CsvPreview;
use strict;
use warnings;
use Exporter 'import';
use Encode qw(decode FB_CROAK);
use Text::CSV_XS;
use JSON::XS ();
our @EXPORT_OK = qw(preview_csv);

sub parse_sample {
    my ($text, $separator, $truncated) = @_;
    my $csv = Text::CSV_XS->new({binary => 1, sep_char => $separator});
    open my $fh, '<', \$text or die "Cannot read CSV sample\n";
    my @rows;
    while (my $row = $csv->getline($fh)) {
        push @rows, $row;
        last if @rows >= 101;
    }
    my $code = ($csv->error_diag)[0];
    return if $code && $code != 2012 && !($truncated && $csv->eof);
    return unless @rows;
    my $width = @{$rows[0]};
    return if grep {@$_ != $width} @rows;
    return \@rows;
}

sub preview_csv {
    my ($jobs, $request) = @_;
    die "Select a CSV input first\n" unless $request->{handle};
    my $file = $jobs->resolve_grant($request->{handle});
    die "CSV input must be a regular file\n" unless -f $file;
    open my $fh, '<:raw', $file or die "Cannot read CSV input: $!\n";
    my $limit = 512 * 1024;
    my $read = read($fh, my $bytes, $limit + 1);
    die "Cannot read CSV input: $!\n" unless defined $read;
    close $fh;
    my $truncated = length($bytes) > $limit;
    if ($truncated) {
        my $end = rindex($bytes, "\n", $limit - 1);
        die "CSV records exceed the preview size limit; use the CLI for this file\n" if $end < 0;
        $bytes = substr($bytes, 0, $end + 1);
    }
    my $text = decode('UTF-8', $bytes, FB_CROAK);
    $text =~ s/^\x{FEFF}//;
    my @separators = (',', ';', "\t", '|');
    my $separator = $request->{separator};
    die "Unsupported column separator\n" if defined($separator) && !grep {$_ eq $separator} @separators;
    my $array = $request->{arraySeparator} // '';
    die "Unsupported multi-value separator\n" unless grep {$_ eq $array} ('', ',', ';', '|');
    my $rows;
    if (defined $separator) {
        $rows = parse_sample($text, $separator, $truncated);
    } else {
        my @valid;
        for my $candidate (@separators) {
            my $parsed = parse_sample($text, $candidate, $truncated);
            push @valid, [$candidate, $parsed] if $parsed && @{$parsed->[0]} > 1;
        }
        return {ambiguous => JSON::XS::true, headers => [], rows => [], candidates => [],
            note => 'Could not identify one column separator reliably. Select it explicitly.'} unless @valid == 1;
        ($separator, $rows) = @{$valid[0]};
    }
    die "CSV sample has malformed quoting or inconsistent column counts\n" unless $rows;
    my $headers = shift @$rows;
    $_ =~ tr/()//d for @$headers;
    my %seen;
    for (@$headers) {
        die "CSV contains an empty header after normalization\n" unless /\S/;
        die "CSV contains duplicate header <$_> after normalization\n" if $seen{$_}++;
    }
    die "CSV has too many columns for the preview (maximum 200)\n" if @$headers > 200;
    my @candidates;
    if (@$rows >= 2) {
        for my $i (0 .. $#$headers) {
            my %values;
            my $valid = 1;
            for my $row (@$rows) {
                my $value = $row->[$i] // '';
                if ($value !~ /\S/ || $values{$value}++ || (length($array) && index($value, $array) >= 0)) {$valid = 0; last}
            }
            push @candidates, $headers->[$i] if $valid;
        }
    }
    my ($suggested) = grep {lc($_) eq 'id'} @candidates;
    $suggested //= $candidates[0];
    my $generated = 'record_id';
    $generated .= '_' while $seen{$generated};
    return {separator => $separator, headers => $headers, rows => [@$rows[0 .. (@$rows < 5 ? $#$rows : 4)]],
        candidates => \@candidates, suggested => $suggested, generated => $generated,
        sampledRows => scalar(@$rows), note => 'Preview checks at most 100 records and 512 KiB. Identifier uniqueness is only checked in this sample.'};
}
1;
