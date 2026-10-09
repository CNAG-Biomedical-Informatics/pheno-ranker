use strict;
use warnings;
use lib qw(lib app/engine/lib);
use Test::More;
use File::Temp qw(tempdir);
use Cwd qw(abs_path);
use Path::Tiny qw(path);
use JSON::XS qw(decode_json);
use Time::HiRes qw(time sleep);
use Pheno::Ranker::Desktop::Service qw(example_files);
use Pheno::Ranker::Desktop::Jobs;

my $tmp = tempdir(CLEANUP => 1);
my $jobs = Pheno::Ranker::Desktop::Jobs->new(root => "$tmp/jobs", worker => abs_path('app/engine/worker.pl'));
END { $jobs->shutdown if $jobs }
for my $mode (qw(patient cohort csv omim orpha)) {
    my $files = example_files($mode);
    ok(-f $_, "$mode example file exists") for values %$files;
}
eval { example_files('../etc/passwd') };
like($@, qr/Unknown example/, 'example selection is an allowlist');
eval { example_files('corpus') };
like($@, qr/Unknown example/, 'removed corpus use case is unavailable');
my $patient = decode_json(path(example_files('omim')->{target})->slurp_raw);
is($patient->{id}, 'PMID_35344616_A2', 'OMIM target matches the tutorial');

for my $mode (qw(omim orpha)) {
    my $cohort = example_files($mode, 'cohort');
    is_deeply([sort keys %$cohort], ['reference'], "$mode cohort loads only the disease reference");
    is($cohort->{reference}, example_files($mode, 'patient')->{reference}, 'both modes use the same reference');
    eval { example_files($mode, 'invalid') };
    like($@, qr/Unknown example operation/, 'invalid mode is rejected');
    my $paths = example_files($mode);
    my %files = map {$_ => [$jobs->register_file($paths->{$_})->{id}]} keys %$paths;
    my $options = {'include-terms' => ['phenotypicFeatures'], 'sort-by' => 'jaccard', 'max-out' => 5, align => JSON::XS::true};
    my $job = $jobs->submit({conversion => 'patient',
        input => {files => \%files}, options => $options, output => {}});
    my $deadline = time + 120;
    while ($jobs->status($job->{id})->{status} =~ /^(queued|running)$/) {
        die 'Example timed out' if time > $deadline;
        $jobs->poll; sleep .05;
    }
    my $result = $jobs->status($job->{id});
    is($result->{status}, 'completed', "$mode example executes") or diag $result->{message};
    my $output = path($result->{directory}, 'rank.txt');
    ok(-s $output, "$mode creates analysis output");
    my $execution = decode_json(path($result->{directory}, 'run.json')->slurp_raw);
    ok scalar(grep {$_ eq '--precomputed-ref-prefix'} @{$execution->{commands}[0]}), "$mode job uses bundled cache";
    like($output->slurp_raw, qr/PMID_35344616_A2/, 'ranking contains the tutorial target');
    my $prefix = uc $mode;
    like($output->slurp_raw, qr/\Q$prefix\E:/, 'ranking uses the selected disease reference');
}
$? = 37 << 8;
$jobs->shutdown;
is($?, 37 << 8, 'worker cleanup preserves the caller exit status');
done_testing;
