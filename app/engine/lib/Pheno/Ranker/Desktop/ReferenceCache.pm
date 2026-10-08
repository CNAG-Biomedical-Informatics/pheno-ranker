package Pheno::Ranker::Desktop::ReferenceCache;
use strict;
use warnings;
use Cwd qw(abs_path);
use File::Spec::Functions qw(catfile);
use Digest::SHA qw(sha256_hex);
use Path::Tiny qw(path);
use JSON::XS qw(decode_json);
use Pheno::Ranker::Version;

sub plan {
    my ($root, $operation, $files, $options) = @_;
    return {} unless $operation =~ /\A(?:patient|cohort)\z/;
    my @references = @{$files->{reference} || []};
    my @datasets = grep {
        my $source = abs_path(catfile($root, 'share', 'diseases', 'hpo', "$_.pxf.json.gz"));
        defined($source) && grep { (abs_path($_->{path}) || '') eq $source } @references;
    } qw(omim orpha);
    return {} unless @datasets;
    my $result = {dataset => join(' + ', map {uc} @datasets), mode => 'raw'};
    my $rebuild = sub { +{%$result, reason => $_[0]} };
    return $rebuild->('Multiple reference cohorts are selected.') if @references != 1 || @{$files->{precomputed} || []};
    return $rebuild->('A custom configuration or weights file is selected.')
      if @{$files->{config} || []} || @{$files->{weights} || []};
    my $terms = $options->{'include-terms'} || [];
    return $rebuild->('The selected terms differ from the bundled phenotypic features.')
      unless ref($terms) eq 'ARRAY' && @$terms == 1 && $terms->[0] eq 'phenotypicFeatures';

    # Only known comparison/output settings can bypass reference preparation.
    my %compatible = map {$_ => 1} qw(include-terms sort-by max-out align export
        similarity-metric-cohort matrix-format max-matrix-records-in-ram
        cytoscape-json graph-stats allow-large-graph graph-min-weight graph-max-weight
        projection mds n-neighbors min-dist seed);
    for my $key (sort keys %$options) {
        next if $compatible{$key};
        my $value = $options->{$key};
        next if ref($value) eq 'ARRAY' && !@$value;
        next if JSON::XS::is_bool($value) && !$value;
        return $rebuild->("The $key setting requires reference preparation.");
    }
    my $dataset = $datasets[0];
    my $dir = path($root, 'app', 'data', 'precomputed', $dataset);
    my $valid = eval {
        my $manifest = decode_json($dir->child('manifest.json')->slurp_raw);
        die 'version' unless $manifest->{engineVersion} eq $Pheno::Ranker::Version::VERSION;
        die 'source' unless sha256_hex(path($references[0]{path})->slurp_raw) eq $manifest->{sourceSha256};
        die 'config' unless sha256_hex(path($root, 'share', 'conf', 'config.yaml')->slurp_raw) eq $manifest->{configSha256};
        for my $kind (qw(glob_hash ref_hash ref_binary_hash coverage_stats labels)) {
            my $name = "$dataset.$kind.json.gz";
            die 'bundle' unless sha256_hex($dir->child($name)->slurp_raw) eq $manifest->{files}{$name}{sha256};
        }
        1;
    };
    return $rebuild->('The bundled cache is unavailable or does not match the current reference and engine.') unless $valid;
    return {%$result, mode => 'cached', prefix => "$dir/$dataset"};
}

1;
