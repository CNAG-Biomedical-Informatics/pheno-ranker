package Pheno::Ranker::Desktop::Safety;
use strict;
use warnings;
use Exporter 'import';
use JSON::XS;
use Path::Tiny qw(path);
use Digest::SHA qw(sha256_hex);
use Pheno::Ranker::Desktop::Limits qw(limits);
our @EXPORT_OK = qw(assess);

# Counts for the bundled HPO cohorts, keyed by compressed content, not filename.
# Unknown or changed gzip files remain uncounted; no decompression is needed.
my %bundled_counts = (
    '01b52466cd5d5cfbe034a8c600fef3255b5ce8240502bd8b5170c999438f8b99' => 6471,
    '7e86f2bc993bd1d9a93c1968d901d434d0ac9c5d995f09f1212a1fda06f4c8d8' => 6471,
    '6e1cc8e0a13bc796e9e59b154a7b2a4625ed0ef448864917589aed01efa72676' => 2402,
    '96c8d7a2ac0efc631b4e1f77a4728445f76b3e0ed04d0154afcd13a89b38e92c' => 2402,
);

# Keep total reads bounded, including gzip fingerprints and ordinary JSON.
sub assess {
    my ($operation,$files,$options,$inline,$settings)=@_;
    my $limit=limits($settings)->{graphExportRecords};
    return {warnings=>[],notes=>[]} unless $operation eq 'cohort';
    my $count=0;
    if (defined $inline) { $count=ref($inline) eq 'ARRAY' ? scalar @$inline : undef }
    else {
        my @entries=@{$files->{reference} || []};
        my $cached=!@entries;
        @entries=grep {$_->{filename} =~ /\.ref_binary_hash\.json\z/} @{$files->{precomputed} || []} if $cached;
        $count=undef unless @entries;
        my $budget=8*1024*1024;
        for my $entry (@entries) {
            last unless defined $count;
            my $file=$entry->{path};
            if (!-f $file || $file !~ /\.json(?:\.gz)?\z/i || -s $file > $budget) { $count=undef; last }
            open my $fh, '<:raw', $file or do { $count=undef; last };
            my $read = read($fh, my $bytes, $budget + 1);
            close $fh;
            if (!defined($read) || $read > $budget) { $count=undef; last }
            $budget -= $read;
            if ($file =~ /\.gz\z/i) {
                my $known = $cached ? undef : $bundled_counts{sha256_hex($bytes)};
                if (!defined $known) { $count=undef; last }
                $count += $known;
                next;
            }
            my $data=eval {decode_json($bytes)};
            if ($cached && ref($data) eq 'HASH') { $count+=keys %$data }
            elsif (!$cached && ref($data) eq 'ARRAY') { $count+=@$data }
            else { $count=undef }
        }
    }
    my $graph_large=!defined($count) || $count>$limit;
    my @warnings;
    my @notes;
    my $skip_graph=$graph_large && ($options->{'cytoscape-json'} || $options->{'graph-stats'}) && !$options->{'allow-large-graph'};
    if ($skip_graph) {
        push @notes,defined($count)
          ? "Matrix results remain complete. Optional graph export and graph statistics are omitted above the configured limit of $limit records."
          : 'Matrix results remain complete. Optional graph export and graph statistics are omitted because the record count is unavailable.';
    } elsif ($graph_large && ($options->{'cytoscape-json'} || $options->{'graph-stats'})) {
        push @warnings,'Large graph export explicitly enabled. Edges accumulate in memory and may exhaust RAM, even with matrix RAM-efficient mode or edge filters.';
    }
    return {warnings=>\@warnings,notes=>\@notes,recordCount=>$count,
        possibleEdges=>defined($count) ? $count*($count-1)/2 : undef,
        skipGraph=>$skip_graph ? JSON::XS::true : JSON::XS::false};
}
1;
