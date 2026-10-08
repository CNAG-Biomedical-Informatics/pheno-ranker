use strict;
use warnings;
use Test::More;
use File::Temp qw(tempdir);
use File::Spec::Functions qw(catfile);
use Digest::SHA qw(sha256_hex);
use Path::Tiny qw(path);
use IO::Uncompress::Gunzip qw(gunzip $GunzipError);
use JSON::XS qw(decode_json);

my $tmp = tempdir(CLEANUP => 1);
for my $dataset (qw(omim orpha)) {
    my $dir = path('app', 'data', 'precomputed', $dataset);
    my $manifest = decode_json($dir->child('manifest.json')->slurp_raw);
    is sha256_hex(path($manifest->{source})->slurp_raw), $manifest->{sourceSha256}, "$dataset source matches manifest";
    is sha256_hex(path('share/conf/config.yaml')->slurp_raw), $manifest->{configSha256}, "$dataset config matches manifest";
    my %data;
    for my $kind (qw(glob_hash ref_hash ref_binary_hash coverage_stats labels)) {
        my $name = "$dataset.$kind.json.gz";
        my $bytes = $dir->child($name)->slurp_raw;
        is sha256_hex($bytes), $manifest->{files}{$name}{sha256}, "$dataset $kind compressed checksum";
        my $plain;
        gunzip \$bytes => \$plain or die $GunzipError;
        is sha256_hex($plain), $manifest->{files}{$name}{uncompressedSha256}, "$dataset $kind content checksum";
        $data{$kind} = decode_json($plain);
    }
    is_deeply [sort keys %{$data{labels}}], [sort keys %{$data{glob_hash}}], "$dataset labels match vector keys";
    is scalar(keys %{$data{ref_hash}}), $manifest->{coverage}{cohort_size}, "$dataset reference count matches";
    my $output = catfile($tmp, "$dataset.rank.txt");
    my $status;
    {
        local *STDOUT;
        local *STDERR;
        open STDOUT, '>', catfile($tmp, "$dataset.stdout") or die $!;
        open STDERR, '>', catfile($tmp, "$dataset.stderr") or die $!;
        $status = system $^X, catfile('bin', 'pheno-ranker'), '--precomputed-ref-prefix', "$dir/$dataset",
            '--target', catfile('app', 'engine', 'examples', 'patient.json'), '--include-terms', 'phenotypicFeatures',
            '--sort-by', 'jaccard', '--max-out', '5', '--out-file', $output, '--no-color';
    }
    is $status, 0, "$dataset compressed bundle executes";
    like path($output)->slurp_raw, qr/PMID_35344616_A2/, "$dataset ranking contains example patient";
}
done_testing;
