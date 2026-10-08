use strict;
use warnings;
use lib qw(lib app/engine/lib);
use Test::More;
use File::Temp qw(tempdir);
use Cwd qw(abs_path);
use Path::Tiny qw(path);
use JSON::XS ();
use Pheno::Ranker::Desktop::Service qw(root example_files execute_files);
use Pheno::Ranker::Desktop::ReferenceCache;

my $tmp = tempdir(CLEANUP => 1);
my $defaults = {'include-terms' => ['phenotypicFeatures']};
for my $dataset (qw(omim orpha)) {
    for my $operation (qw(patient cohort)) {
        my $paths = example_files($dataset, $operation);
        my $files = {map {$_ => [{path => $paths->{$_}}]} keys %$paths};
        my $plan = sub {Pheno::Ranker::Desktop::ReferenceCache::plan(root(), $operation, $_[0] || $files, $_[1] || $defaults)};
        is $plan->()->{mode}, 'cached', "$dataset $operation defaults reuse cache";
        for my $pair (['similarity-metric-cohort', 'jaccard'], ['sort-by', 'hamming'], ['max-out', 3],
            ['graph-min-weight', 0.3], ['projection', 'umap'], ['matrix-format', 'mtx'],
            ['export', JSON::XS::true], ['max-matrix-records-in-ram', 0]) {
            is $plan->(undef, {%$defaults, $pair->[0] => $pair->[1]})->{mode}, 'cached', "$pair->[0] reuses $dataset cache";
        }
        for my $pair (['include-terms', ['diseases']], ['include-terms', []], ['exclude-terms', ['phenotypicFeatures']],
            ['age', JSON::XS::true], ['include-hpo-ascendants', JSON::XS::true],
            ['retain-excluded-phenotypicFeatures', JSON::XS::true], ['max-number-vars', 100],
            ['append-prefixes', ['C']], ['patients-of-interest', ['ORPHA:1']], ['future-option', 1]) {
            is $plan->(undef, {%$defaults, $pair->[0] => $pair->[1]})->{mode}, 'raw', "$pair->[0] rebuilds $dataset reference";
        }
        is $plan->(undef, {%$defaults, age => JSON::XS::false, 'exclude-terms' => []})->{mode}, 'cached', 'disabled preparation options allow reuse';
        is $plan->(undef, {})->{mode}, 'raw', 'all terms require raw data';
        for my $role (qw(config weights)) {
            is $plan->({%$files, $role => [{path => 'custom.yaml'}]})->{mode}, 'raw', "$role requires raw data";
        }
        is $plan->({%$files, reference => [@{$files->{reference}}, {path => abs_path('t/data/individuals.json')}]})->{mode}, 'raw', 'additional references require raw data';
        is_deeply $plan->({reference => [{path => abs_path('t/data/individuals.json')}]}), {}, 'ordinary inputs are not substituted';

        # Exercise command selection without repeatedly computing large matrices.
        for my $cached (0, 1) {
            my @commands;
            my @progress;
            no warnings 'redefine';
            local *Pheno::Ranker::Desktop::Service::_run_command = sub {shift; push @commands, [@_]};
            execute_files($operation, {options => {%$defaults, ($operation eq 'cohort' ? (projection => 'none') : ()),
                ($cached ? () : ('include-terms' => ['diseases']))}}, $files,
                {directory => $tmp, progress => sub {push @progress, shift}});
            my $command = join(' ', @{$commands[0]});
            like $command, $cached ? qr/--precomputed-ref-prefix/ : qr/--reference /, "$operation command chooses correct input";
            unlike $command, $cached ? qr/--reference / : qr/--precomputed-ref-prefix/, 'command never mixes reference routes';
            like join(' ', @progress), $cached ? qr/Using precomputed/ : qr/Rebuilding/, 'progress explains preparation';
        }
    }
}

# Validate failure recovery on temporary copies, never on the bundled data.
my $root = path($tmp, 'root');
$root->child('share/diseases/hpo')->mkpath;
$root->child('share/conf')->mkpath;
$root->child('app/data/precomputed/orpha')->mkpath;
for my $relative ('share/diseases/hpo/orpha.pxf.json.gz', 'share/conf/config.yaml',
    map {"app/data/precomputed/orpha/$_"} map {$_->basename} path('app/data/precomputed/orpha')->children) {
    path($relative)->copy($root->child($relative));
}
my $files = {reference => [{path => "$root/share/diseases/hpo/orpha.pxf.json.gz"}]};
my $plan = sub {Pheno::Ranker::Desktop::ReferenceCache::plan("$root", 'cohort', $files, $defaults)};
is $plan->()->{mode}, 'cached', 'temporary complete bundle is eligible';
$root->child('app/data/precomputed/orpha/orpha.labels.json.gz')->spew_raw('corrupt');
is $plan->()->{mode}, 'raw', 'damaged cache falls back to source';
path('app/data/precomputed/orpha/orpha.labels.json.gz')->copy($root->child('app/data/precomputed/orpha/orpha.labels.json.gz'));
$root->child('share/conf/config.yaml')->append_raw("\n# modified\n");
is $plan->()->{mode}, 'raw', 'modified configuration invalidates bundle';
path('share/conf/config.yaml')->copy($root->child('share/conf/config.yaml'));
$root->child('share/diseases/hpo/orpha.pxf.json.gz')->append_raw('changed');
is $plan->()->{mode}, 'raw', 'modified source invalidates bundle';

require Test::Mojo;
local $ENV{PHENO_RANKER_API_TOKEN} = 'c' x 32;
local $ENV{PHENO_RANKER_STATE_DIR} = tempdir(CLEANUP => 1);
require './app/engine/main.pl';
my $t = Test::Mojo->new(main::app());
my $auth = {Authorization => 'Bearer ' . $ENV{PHENO_RANKER_API_TOKEN}};
$t->post_ok('/api/examples/orpha' => $auth => json => {operation => 'cohort'})->status_is(200);
my $id = $t->tx->res->json('/data/reference/0/id');
my $request = {conversion => 'cohort', input => {files => {reference => [$id]}}, options => $defaults};
$t->post_ok('/api/reference-plan' => $auth => json => $request)->status_is(200)
  ->json_is('/data/mode', 'cached')->json_is('/data/dataset', 'ORPHA')->json_hasnt('/data/prefix');
$request->{options} = {%$defaults, age => JSON::XS::true};
$t->post_ok('/api/reference-plan' => $auth => json => $request)->status_is(200)->json_is('/data/mode', 'raw');
$t->post_ok('/api/reference-plan' => json => $request)->status_is(401);
done_testing;
