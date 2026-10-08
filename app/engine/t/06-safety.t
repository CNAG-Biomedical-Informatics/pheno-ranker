use strict;
use warnings;
use lib qw(lib app/engine/lib);
use Test::More;
use File::Temp qw(tempdir);
use Path::Tiny qw(path);
use Cwd qw(abs_path);
use JSON::XS;
use IO::Uncompress::Gunzip qw(gunzip);
use Time::HiRes qw(time sleep);
use Pheno::Ranker::Desktop::Safety qw(assess);
use Pheno::Ranker::Desktop::Jobs;
use Pheno::Ranker::Desktop::Service qw(execute_files);

my $tmp=tempdir(CLEANUP=>1);
my $file=path($tmp,'records.json');
sub records {
    my ($n)=@_;
    $file->spew_raw(encode_json([map {+{id=>"record-$_"}} 1..$n]));
    return {reference=>[{path=>"$file",filename=>'records.json'}]};
}
my $files=records(1500);
my $safe=assess('cohort',$files,{'cytoscape-json'=>1});
is($safe->{recordCount},1500,'bounded preflight counts records');
ok(!$safe->{skipGraph},'graph allowed at the limit');
$files=records(1501);
my $limited=assess('cohort',$files,{'cytoscape-json'=>1});
ok($limited->{skipGraph},'large graphs skipped by default');
is($limited->{possibleEdges},1125750,'possible undirected edges are explicit');
ok(!assess('cohort',$files,{'cytoscape-json'=>1,'allow-large-graph'=>1})->{skipGraph},'explicit graph opt-in works');
is_deeply(assess('cohort',records(10000),{})->{warnings},[],'10K matrix-only comparison needs no warning');
is_deeply($limited->{warnings},[],'omitting optional graphs needs no warning');
ok(@{$limited->{notes}},'omitted graph is explained neutrally');
ok(@{assess('cohort',$files,{'cytoscape-json'=>1,'allow-large-graph'=>1})->{warnings}},'large graph opt-in retains warning');
my $unknown=assess('cohort',{reference=>[{path=>"$tmp/missing.json",filename=>'missing.json'}]},{'cytoscape-json'=>1});
ok(!defined($unknown->{recordCount}) && $unknown->{skipGraph},'unknown input count retains graph safeguard');
my $large=path($tmp,'large.json');
open my $fh,'>:raw',"$large" or die $!;
truncate $fh,9*1024*1024 or die $!;
close $fh;
ok(!defined assess('cohort',{reference=>[{path=>"$large",filename=>'large.json'}]},{})->{recordCount},'oversized input is not parsed');

for my $dataset (qw(omim orpha)) {
    for my $format (qw(bff pxf)) {
        my $source = path('share','diseases','hpo',"$dataset.$format.json.gz");
        my $json;
        gunzip "$source" => \$json or die $IO::Uncompress::Gunzip::GunzipError;
        my $actual = scalar @{decode_json($json)};
        my $known = assess('cohort',{reference=>[{path=>"$source",filename=>$source->basename}]},{'cytoscape-json'=>1});
        is($known->{recordCount},$actual,"$dataset $format fingerprint count matches bundled contents");
        ok($known->{skipGraph},'known large reference retains graph safeguard');
    }
}
my $copy = path($tmp,'renamed.json.gz');
path('share/diseases/hpo/omim.pxf.json.gz')->copy($copy);
is(assess('cohort',{reference=>[{path=>"$copy",filename=>'renamed.json.gz'}]},{})->{recordCount},6471,'renamed copy is recognized by content');
$copy->append_raw('changed');
ok(!defined assess('cohort',{reference=>[{path=>"$copy",filename=>'omim.pxf.json.gz'}]},{})->{recordCount},'changed content never inherits the bundled count');
my $mixed = assess('cohort',{reference=>[
    {path=>'share/diseases/hpo/omim.pxf.json.gz',filename=>'omim.pxf.json.gz'},
    {path=>'share/diseases/hpo/orpha.pxf.json.gz',filename=>'orpha.pxf.json.gz'},
]},{});
is($mixed->{recordCount},8873,'bundled cohort counts are summed');

{
    no warnings 'redefine';
    my @commands;
    local *Pheno::Ranker::Desktop::Service::_run_command=sub {shift; push @commands,[@_]};
    my $out=path($tmp,'out'); $out->mkpath;
    my $result=execute_files('cohort',{options=>{'cytoscape-json'=>JSON::XS::true,'graph-stats'=>JSON::XS::true}},records(1501),{directory=>"$out"});
    ok(!grep(/--(?:cytoscape-json|graph-stats)/,@{$commands[0]}),'unsafe graph flags never reach the CLI');
    ok(grep($_ eq 'matrix.txt',@{$commands[0]}),'matrix output remains requested');
    ok(@{$result->{notes}},'skipped graph note retained in results');
    my $run=decode_json($out->child('run.json')->slurp_raw);
    ok(@{$run->{notes}},'note retained on disk');
    @commands=();
    execute_files('cohort',{options=>{'cytoscape-json'=>JSON::XS::true,'allow-large-graph'=>JSON::XS::true}},records(1501),{directory=>"$out"});
    ok(grep($_ eq '--cytoscape-json',@{$commands[0]}),'explicit opt-in exports the whole requested graph');
    ok(!grep(/allow-large-graph/,@{$commands[0]}),'desktop safety flag is never passed to CLI');
}

local $ENV{PHENO_RANKER_JOB_LIMIT}=3;
my $jobs=Pheno::Ranker::Desktop::Jobs->new(root=>"$tmp/jobs",worker=>abs_path('app/engine/t/blocking-worker.pl'));
$jobs->update_settings({maxConcurrentJobs=>3});
sub enqueue {
    my ($n,$extra)=@_;
    return $jobs->submit({conversion=>'cohort',input=>{data=>[map {+{id=>$_}} 1..$n]},options=>$extra || {},output=>{}});
}
my $small=enqueue(1);
my $big=enqueue(10000);
my $behind=enqueue(1);
is($jobs->status($big->{id})->{status},'running','10K job honours configured concurrency');
is($jobs->status($behind->{id})->{status},'running','other jobs can run beside a 10K job');
my $pending=enqueue(10000);
is($jobs->status($pending->{id})->{status},'queued','configured limit still queues excess jobs');
sub cancel_and_wait {
    my ($job)=@_;
    # Wait for the test worker to establish its process group before cancelling.
    my $deadline=time+10;
    until (-f path($tmp,'jobs',$job->{id},'worker-ready')) {die 'worker timeout' if time>$deadline; sleep .02}
    $jobs->cancel($job->{id});
    while ($jobs->status($job->{id})->{status} eq 'cancelling') {die 'cancel timeout' if time>$deadline; $jobs->poll; sleep .02}
}
cancel_and_wait($small);
is($jobs->status($pending->{id})->{status},'running','second 10K job starts when a slot becomes available');
ok($jobs->status($big->{id})->{started},'execution start time recorded');
cancel_and_wait($big);
is($jobs->status($behind->{id})->{status},'running','other running jobs remain unaffected');
cancel_and_wait($behind);
cancel_and_wait($pending);
$jobs->shutdown;
done_testing;
