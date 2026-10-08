use strict;
use warnings;
use lib qw(lib app/engine/lib);
use Test::More;
use File::Temp qw(tempdir);
use Cwd qw(abs_path);
use JSON::XS qw(decode_json);
use Mojo::UserAgent;
use Mojolicious;
use Path::Tiny qw(path);
use Pheno::Ranker::Desktop::Beacon qw(import_individuals discover_filters);
use Pheno::Ranker::Desktop::Jobs;
use Pheno::Ranker::Desktop::Projects;

my $remote=Mojolicious->new;
my $ua=Mojo::UserAgent->new;
$ua->server->app($remote);
my $base=$ua->server->url->clone;
$base->path('/api');
my @requests;
$remote->routes->get('/api/map')->to(cb=>sub {
    my $c=shift;
    is($c->req->headers->authorization,'Bearer private-token','discovery receives bearer token');
    $c->render(json=>{endpointSets=>{individualEndpoints=>{rootUrl=>"$base/individuals"}}});
});
$remote->routes->post('/api/individuals')->to(cb=>sub {
    my $c=shift;
    is($c->req->headers->authorization,'Bearer private-token','query receives bearer token');
    my $request=$c->req->json; push @requests,$request;
    my $page=$request->{query}{pagination}{currentPage};
    my $number=defined($page) ? 2 : 1;
    my $pagination=defined($page) ? {} : {nextPage=>'page-two'};
    $c->render(json=>{
        meta=>{returnedGranularity=>'record',receivedRequestSummary=>{pagination=>$pagination}},
        response=>{resultSets=>[{id=>'study A',setType=>'dataset',exists=>JSON::XS::true,
            results=>[{id=>"patient-$number",phenotypicFeatures=>[]}]}]},
        responseSummary=>{exists=>JSON::XS::true,numTotalResults=>2},
    });
});

my $tmp=tempdir(CLEANUP=>1);
my $jobs=Pheno::Ranker::Desktop::Jobs->new(root=>"$tmp/jobs",worker=>abs_path('app/engine/worker.pl'));
END {$jobs->shutdown if $jobs}
my $result=import_individuals($jobs,{url=>"$base",token=>'private-token',filters=>['HP:0001250'],maxPages=>3,pageSize=>1},ua=>$ua);
is($result->{pages},2,'all Beacon pages are imported');
is($result->{records},2,'record count is reported');
is(scalar @{$result->{files}},1,'one file is produced per result set');
is_deeply([map {$_->{id}} @{decode_json(path($jobs->resolve_grant($result->{files}[0]{id}))->slurp_raw)}],
    ['patient-1','patient-2'],'records retain page order');
is($requests[1]{query}{pagination}{currentPage},'page-two','next page token is sent');
is_deeply($requests[0]{query}{filters},[{id=>'HP:0001250'}],'filters are sent as standard Beacon POST objects');

my $imported=$jobs->resolve_grant($result->{files}[0]{id});
my $provenance=path("$imported.provenance.json")->slurp_utf8;
unlike($provenance,qr/private-token/,'provenance excludes bearer token');
like($provenance,qr/HP:0001250/,'provenance retains the reproducible query');
my $project_dir=path($tmp,'project'); $project_dir->mkpath;
my $project=$project_dir->child('beacon.phenoranker');
Pheno::Ranker::Desktop::Projects::save($jobs,"$project",{
    settings=>{conversion=>'cohort',options=>{},output=>{}},files=>{reference=>[$result->{files}[0]{id}]},runs=>[],
});
my $manifest=decode_json($project->slurp_raw);
ok($manifest->{sources}{reference}[0]{provenance},'project records imported provenance');
ok(-f path($project_dir,$manifest->{sources}{reference}[0]{provenance}),'project copies imported provenance');

eval {import_individuals($jobs,{url=>"$base",token=>"bad\nvalue"},ua=>$ua)};
like($@,qr/Invalid Beacon bearer token/,'header injection is rejected');
my $offset_base = $base->clone; $offset_base->path('/offset');
my $repeat = 0;
$remote->routes->get('/offset/map')->to(cb=>sub {
    my $c=shift;
    unless ($c->req->url->path->trailing_slash) {
        $c->res->headers->location("$offset_base/map/");
        return $c->render(status=>308,text=>'redirect');
    }
    $c->render(json=>{response=>{endpointSets=>{individual=>{entryType=>'individual',rootUrl=>"$offset_base/individuals"}}}});
});
my @offsets;
$remote->routes->post('/offset/individuals')->to(cb=>sub {
    my $c=shift;
    if (!$c->req->url->path->trailing_slash) {
        $c->res->headers->location("$offset_base/individuals/");
        return $c->render(status=>308,text=>'redirect');
    }
    my $pagination=$c->req->json->{query}{pagination};
    my $skip=$pagination->{skip}; push @offsets,$skip;
    my @records=$skip && !$repeat ? ({id=>'third'}) : ({id=>'first'}, {id=>'second'});
    $c->render(json=>{meta=>{receivedRequestSummary=>{pagination=>{skip=>$skip,limit=>2}}},
        response=>{resultSets=>[{id=>'public',results=>\@records,resultsCount=>3}]}});
});
$remote->routes->post('/unsafe/individuals')->to(cb=>sub {
    my $c=shift; $c->res->headers->location('https://untrusted.example/individuals/');
    $c->render(status=>308,text=>'redirect');
});
my $offset_request={url=>"$offset_base",pageSize=>2,maxPages=>3};
my $offset_result=import_individuals($jobs,$offset_request,ua=>$ua);
is $offset_result->{records},3,'imports all records using offset pagination and modern map';
is_deeply \@offsets,[0,2],'requests successive offsets';
my $direct=import_individuals($jobs,{%$offset_request,url=>"$offset_base/individuals"},ua=>$ua);
is $direct->{records},3,'accepts a direct individuals endpoint and preserves POST through slash redirect';
eval {import_individuals($jobs,{%$offset_request,maxPages=>1},ua=>$ua)};
like $@,qr/maxPages before completion/,'does not accept an offset-limited partial cohort';
my $sample=import_individuals($jobs,{%$offset_request,maxPages=>1,allowPartial=>JSON::XS::true},ua=>$ua);
is $sample->{records},2,'explicit limited import retains the requested first page';
ok $sample->{pageLimitReached},'limited import is not presented as a complete cohort';
my $sample_path=$jobs->resolve_grant($sample->{files}[0]{id});
ok decode_json(path("$sample_path.provenance.json")->slurp_raw)->{pageLimitReached},'limit is recorded in provenance';
ok !$offset_result->{pageLimitReached},'completed imports are not marked limited';
my $token_sample=import_individuals($jobs,{url=>"$base",token=>'private-token',maxPages=>1,allowPartial=>JSON::XS::true},ua=>$ua);
ok $token_sample->{pageLimitReached},'limited imports also work with token pagination';
eval {import_individuals($jobs,{%$offset_request,allowPartial=>'false'},ua=>$ua)};
like $@,qr/must be a boolean/,'string false cannot silently enable partial imports';

$remote->routes->get('/offset/individuals/filtering_terms')->to(cb=>sub {
    shift->render(json=>{response=>{filteringTerms=>[
        {id=>'HP:0001250',label=>'Seizure',type=>'ontologyTerm'},
        {id=>'HP:0001250',label=>'Duplicate'},
        {id=>'age',type=>'alphanumeric'},
        {id=>'LOCAL:1'},
    ]}});
});
is_deeply discover_filters({url=>"$offset_base/individuals"},ua=>$ua)->{terms},
    [{id=>'HP:0001250',label=>'Seizure'},{id=>'LOCAL:1',label=>'LOCAL:1'}],
    'discovery returns labelled unique terms without unsupported value filters';
$remote->routes->get('/fallback/individuals/filtering_terms')->to(cb=>sub {shift->render(status=>404,text=>'missing')});
$remote->routes->get('/fallback/filtering_terms')->to(cb=>sub {shift->render(json=>{response=>{filteringTerms=>[]}})});
my $fallback=$base->clone; $fallback->path('/fallback/individuals');
is_deeply discover_filters({url=>"$fallback"},ua=>$ua)->{terms},[], 'falls back to root catalogue and accepts empty lists';
$repeat=1;
eval {import_individuals($jobs,$offset_request,ua=>$ua)};
like $@,qr/pagination may have repeated/,'rejects servers that repeat records across pages';
my $unsafe=$base->clone; $unsafe->path('/unsafe/individuals');
eval {import_individuals($jobs,{url=>"$unsafe",token=>'private-token'},ua=>$ua)};
like $@,qr/unexpected endpoint/,'does not forward bearer tokens across redirects to another endpoint';
$jobs->shutdown;
done_testing;
