use strict;
use warnings;
use lib qw(lib app/engine/lib);
use Test::More;
use File::Temp qw(tempdir);
use Path::Tiny qw(path);
use Cwd qw(abs_path);
use Time::HiRes qw(time sleep);
use Pheno::Ranker::Desktop::Jobs;

my $tmp=tempdir(CLEANUP=>1);
my $results=path($tmp,'results'); $results->mkpath;
my $override=path($tmp,'override'); $override->mkpath;
my $original=$results->child('original.txt'); $original->spew_utf8('Keep this input');
my $worker=abs_path('app/engine/worker.pl');
my $jobs=Pheno::Ranker::Desktop::Jobs->new(root=>"$tmp/jobs",worker=>$worker);
END {$jobs->shutdown if $jobs}
my $grant=$jobs->register_file("$results");
$jobs->update_settings({defaultOutputFolder=>$grant->{id}});
is($jobs->settings->{defaultOutputFolder},"$results",'global results folder stored');
$jobs->update_settings({maxConcurrentJobs=>1});
is($jobs->settings->{defaultOutputFolder},"$results",'scheduler updates preserve folder');
ok(!eval {$jobs->update_settings({defaultOutputFolder=>"$override"});1},'ungranted raw paths rejected');
ok(!eval {$jobs->update_settings({defaultOutputFolder=>$jobs->register_file("$original")->{id}});1},'files cannot be result folders');
$jobs->shutdown;
$jobs=Pheno::Ranker::Desktop::Jobs->new(root=>"$tmp/jobs",worker=>$worker);
is($jobs->settings->{defaultOutputFolder},"$results",'folder survives restart without session handles');
sub run {
    my ($destination)=@_;
    my $job=$jobs->submit({conversion=>'simulate',input=>{files=>{}},options=>{number=>2},output=>{},defined($destination) ? (destination=>$destination) : ()});
    my $deadline=time+20;
    while ($jobs->status($job->{id})->{status}=~/^(queued|running)$/) {die 'timeout' if time>$deadline; $jobs->poll; sleep .03}
    $jobs->poll;
    my $done=$jobs->status($job->{id});
    is($done->{status},'completed','job completes') or diag $done->{message};
    return $done;
}
my $first=run();
is($first->{directory},"$results/pheno-ranker-$first->{id}",'default folder receives unique run subfolder');
my $second=run($jobs->register_file("$override")->{id});
is($second->{directory},"$override/pheno-ranker-$second->{id}",'explicit setup folder takes precedence');
$jobs->delete_history($first->{id});
ok(-f path($first->{directory},'simulated.json'),'history-only removal preserves custom outputs');
$jobs->delete_files($first->{id});
ok(!-e $first->{directory},'file deletion removes only run subfolder');
is($original->slurp_utf8,'Keep this input','parent folder and original file remain intact');
rename "$results","$tmp/moved" or die $!;
ok(!eval {$jobs->submit({conversion=>'simulate',input=>{files=>{}},options=>{},output=>{}});1},'unavailable default does not silently redirect outputs');
like($@,qr/Default results folder is unavailable/,'unavailable-folder error points to settings');
$jobs->update_settings({defaultOutputFolder=>undef});
my $managed=run();
is($managed->{directory},"$tmp/jobs/$managed->{id}/outputs",'reset restores application-managed destination');
$jobs->shutdown;
done_testing;
