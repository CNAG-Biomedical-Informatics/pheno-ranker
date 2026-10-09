use strict;
use warnings;
use lib qw(lib app/engine/lib);
use Test::More;
use File::Temp qw(tempdir);
use Cwd qw(abs_path getcwd);
use Path::Tiny qw(path);
use JSON::XS;
use Time::HiRes qw(time sleep);
use Pheno::Ranker::Desktop::Jobs;
use Pheno::Ranker::Desktop::Service qw(root catalog);

is(root(), abs_path('.'), 'engine resolves the repository independently of cwd');
my ($pdf_spec) = grep {$_->{id} eq 'pdf'} @{catalog()->{data}};
my ($hints_option) = grep {$_->{name} eq 'label-hints'} @{$pdf_spec->{options}};
ok($hints_option->{default}, 'label hints default on in PDF creation');
my ($qr_spec) = grep {$_->{id} eq 'qr-encode'} @{catalog()->{data}};
ok(!grep({$_->{name} eq 'label-hints'} @{$qr_spec->{options}}), 'PNG creation has no label enrichment option');
my $tmp = tempdir(CLEANUP=>1);
{
    local $ENV{PHENO_RANKER_SHARE_DIR} = "$tmp/share-override";
    is(system($^X,'-Ilib','-MPheno::Ranker','-e',
        'exit($Pheno::Ranker::share_dir eq $ENV{PHENO_RANKER_SHARE_DIR} ? 0 : 1)'),
        0,'packaged share directory can be selected explicitly');
}
my $jobs=Pheno::Ranker::Desktop::Jobs->new(root=>"$tmp/jobs",worker=>abs_path('app/engine/worker.pl'));
END { $jobs->shutdown if $jobs }
my $ref=abs_path('t/data/individuals.json');
my $target=abs_path('t/data/patient.json');
my $cli=abs_path('bin/pheno-ranker');
my $grant=$jobs->register_file($ref);
my $tar=$jobs->register_file($target);
my ($cohort_spec)=grep {$_->{id} eq 'cohort'} @{catalog()->{data}};
my ($graph_option)=grep {$_->{name} eq 'cytoscape-json'} @{$cohort_spec->{options}};
ok($graph_option->{default}, 'desktop cohort graph export is enabled by default');
my ($export_option)=grep {$_->{name} eq 'export'} @{$cohort_spec->{options}};
ok($export_option->{default}, 'desktop retains QR inputs by default');
ok(!grep($_->{id} eq 'vcf', @{catalog()->{data}}), 'VCF example is not a desktop operation');
sub finish {
    my ($job)=@_;
    my $deadline=time+45;
    while ($jobs->status($job->{id})->{status} =~ /^(queued|running|cancelling)$/) {
        die "Worker timed out" if time>$deadline;
        $jobs->poll; sleep .03;
    }
    my $status=$jobs->status($job->{id});
    is($status->{status},'completed',"$status->{conversion} completes") or diag $status->{message};
    return $status;
}
for my $metric (qw(hamming jaccard)) {
    for my $format (qw(dense mtx)) {
        my $job=finish($jobs->submit({conversion=>'cohort',input=>{files=>{reference=>[$grant->{id}]}},
            options=>{'similarity-metric-cohort'=>$metric,'matrix-format'=>$format,
                'cytoscape-json'=>$format eq 'dense' ? $graph_option->{default} : JSON::XS::false},output=>{}}));
        is(-s path($job->{directory},'graph.json') ? 1 : 0, $format eq 'dense' ? 1 : 0,
            'desktop graph default produces output and explicit opt-out is honored');
        my $file=$format eq 'mtx' ? 'matrix.mtx' : 'matrix.txt';
        my $expected="$tmp/direct-$metric-$format";
        is(system($^X,$cli,'--reference',$ref,'--no-color','--similarity-metric-cohort',$metric,
            '--matrix-format',$format,'--out-file',$expected),0,'direct CLI completes');
        is(path($job->{directory},$file)->slurp_raw,path($expected)->slurp_raw,"$metric $format is byte-identical to CLI");
        my ($artifact)=grep {$_->{filename} eq $file} @{$job->{result}{artifacts}};
        my ($resolved)=$jobs->artifact($job->{id},$artifact->{id});
        ok(-f $resolved,'completed artifact can be reused');
        ok(@{$job->{fingerprints}},'input fingerprints are recorded');
    }
}
my $patient=finish($jobs->submit({conversion=>'patient',input=>{files=>{reference=>[$grant->{id}],target=>[$tar->{id}]}},
    options=>{'max-out'=>5,align=>JSON::XS::true,export=>$export_option->{default}},output=>{}}));
ok(-s path($patient->{directory},'export.ref_binary_hash.json'), 'analysis retains reference profiles');
ok(-s path($patient->{directory},'export.glob_hash.json'), 'analysis retains their matching global hash');
ok(-s path($patient->{directory},'rank.txt'),'patient ranking is produced');
ok(grep($_->{filename}=~/align/,@{$patient->{result}{artifacts}}),'alignment is retained');
my $precomputed_prefix="$tmp/precomputed";
my $precomputed_matrix="$tmp/precomputed-source.txt";
is(system($^X,$cli,'--reference',$ref,'--no-color','--export',$precomputed_prefix,
    '--out-file',$precomputed_matrix),0,'direct CLI creates a temporary precomputed reference set');
my @precomputed=map {$jobs->register_file("$precomputed_prefix.$_.json")}
    qw(glob_hash ref_hash ref_binary_hash coverage_stats);
my $cached=finish($jobs->submit({conversion=>'cohort',input=>{files=>{precomputed=>[map {$_->{id}} @precomputed]}},
    options=>{'similarity-metric-cohort'=>'hamming'},output=>{}}));
is(path($cached->{directory},'matrix.txt')->slurp_raw,path($precomputed_matrix)->slurp_raw,
    'precomputed reference set preserves CLI output');
my $mixed=$jobs->submit({conversion=>'cohort',input=>{files=>{reference=>[$grant->{id}],precomputed=>[map {$_->{id}} @precomputed]}},options=>{},output=>{}});
my $mixed_deadline=time+20;
while ($jobs->status($mixed->{id})->{status} =~ /^(queued|running)$/) {die 'timeout' if time>$mixed_deadline; $jobs->poll; sleep .03}
like($jobs->status($mixed->{id})->{message},qr/not both/,'raw and precomputed references cannot be mixed');
my $csv=$jobs->register_file(abs_path('t/data/example.csv'));
my $prepared=finish($jobs->submit({conversion=>'csv',input=>{files=>{source=>[$csv->{id}]}},options=>{separator=>';','array-separator'=>','},output=>{}}));
ok(-f path($prepared->{directory},'example.json'),'CSV operation produces reusable JSON');
ok(-f path($prepared->{directory},'example_config.yaml'),'CSV configuration is retained');
my $converted=$jobs->register_file(path($prepared->{directory},'example.json')->stringify);
my $configuration=$jobs->register_file(path($prepared->{directory},'example_config.yaml')->stringify);
my $converted_data=decode_json(path($prepared->{directory},'example.json')->slurp_raw);
ok(exists($converted_data->[0]{Foo}) && exists($converted_data->[0]{Bar}),'CSV example is split into separate columns');
my $csv_analysis=finish($jobs->submit({conversion=>'cohort',input=>{files=>{reference=>[$converted->{id}],config=>[$configuration->{id}]}},options=>{},output=>{}}));
like(path($csv_analysis->{directory},'matrix.txt')->slurp_raw,qr/\A\tbaz0\tbaz1\tbaz2\r?\n/,'converted CSV ranks using its generated primary key configuration');
my $sim=finish($jobs->submit({conversion=>'simulate',input=>{files=>{}},options=>{number=>3,'random-seed'=>42},output=>{}}));
is(scalar @{decode_json(path($sim->{directory},'simulated.json')->slurp_raw)},3,'simulator executes through the registry');
my $bad=$jobs->submit({conversion=>'cohort',input=>{files=>{reference=>[$grant->{id}]}},options=>{'out-file'=>'../unsafe'},output=>{}});
my $deadline=time+20;
while ($jobs->status($bad->{id})->{status} =~ /^(queued|running)$/) {die 'timeout' if time>$deadline; $jobs->poll; sleep .03}
is($jobs->status($bad->{id})->{status},'failed','arbitrary CLI output options are rejected');
like($jobs->status($bad->{id})->{message},qr/Unknown option/,'validation gives a useful error');
ok(-f $ref,'original fixture is still present');
my $failing_script=path($tmp,'fail.pl');
$failing_script->spew('print STDERR "specific failure\n"; exit 3;');
eval {Pheno::Ranker::Desktop::Service::_run_command($tmp,$^X,"$failing_script")};
like($@,qr/exit code 3.*specific failure/s,'subprocess stderr is captured with a readable exit code');
eval {Pheno::Ranker::Desktop::Service::_run_command($tmp,$^X,'-e','exit 7')};
like($@,qr/exit code 7/,'exit status remains readable');
my $metadata=$jobs->register_file(path($sim->{directory},'run.json')->stringify);
my $invalid_input=$jobs->submit({conversion=>'cohort',input=>{files=>{reference=>[$metadata->{id}]}},options=>{},output=>{}});
my $invalid_deadline=time+20;
while ($jobs->status($invalid_input->{id})->{status} =~ /^(queued|running)$/) {
    die 'timeout' if time>$invalid_deadline;
    $jobs->poll; sleep .03;
}
my $invalid_status=$jobs->status($invalid_input->{id});
is($invalid_status->{status},'failed','execution metadata is not a cohort');
like($invalid_status->{message},qr/exit code \d+\):\s*\S.+/s,'worker failure retains the CLI diagnostic, not just a numeric status');
$jobs->shutdown;
done_testing;
