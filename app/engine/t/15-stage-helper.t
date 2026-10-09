use strict;
use warnings;
use Test::More;
use File::Temp qw(tempdir);
use Cwd qw(abs_path);
use Path::Tiny qw(path);

plan skip_all => 'POSIX executable permissions' if $^O eq 'MSWin32';

my $tmp = path(abs_path(tempdir(CLEANUP => 1)));
my $root = $tmp->child('project');
my $prefix = $tmp->child('perl');
for my $directory (qw(bin lib share app/data app/engine utils t/data)) {
    $root->child($directory)->mkpath;
}
$prefix->child('bin')->mkpath;
$prefix->child('lib')->mkpath;
# This test isolates file staging, not Inline compilation or runtime validation.
my $perl = $prefix->child('bin/perl');
$perl->spew("#!/bin/sh\nexit 0\n");
chmod 0755, "$perl" or die $!;
for my $file (qw(bin/pheno-ranker LICENSE t/data/individuals.json t/data/patient.json t/data/example.csv)) {
    $root->child($file)->spew("test\n");
}
my $helper = $tmp->child('helper');
$helper->spew("#!/bin/sh\nprintf 'helper-ok\\n'\n");
chmod 0755, "$helper" or die $!;
my @stage = ($^X, 'app/scripts/stage-desktop-engine.pl',
    '--root', "$root", '--perl-prefix', "$prefix", '--python-helper', "$helper");
is(system(@stage), 0, 'stage minimal engine with executable helper');
my $staged = $root->child('app/src-tauri/engine/python/pheno-ranker-helper');
ok(-x "$staged", 'copied Python helper remains executable');
is((stat "$staged")[2] & 0777, 0755, 'source permissions preserved');
is($staged->slurp, $helper->slurp, 'helper content preserved');
is(system("$staged"), 0, 'staged helper can be launched');
chmod 0644, "$helper" or die $!;
isnt(system(@stage), 0, 'reject a non-executable helper during staging');
done_testing;
