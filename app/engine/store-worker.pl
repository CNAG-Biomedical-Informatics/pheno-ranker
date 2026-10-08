#!/usr/bin/env perl
use strict;
use warnings;
use FindBin;
use lib "$FindBin::Bin/lib";
use File::Spec;
use JSON::XS;
use Path::Tiny qw(path);
use Pheno::Ranker::Desktop::Atomic qw(write_atomically);
use Pheno::Ranker::Desktop::PhenopacketStore qw(latest_release download_release merge_collections);

my $directory=path(shift @ARGV || die "Missing task directory\n");
# Results travel via an atomic file, not stdout, avoiding pipe-buffer deadlocks.
open STDOUT,'>',File::Spec->devnull or die $!;
open STDERR,'>',File::Spec->devnull or die $!;
my $json=JSON::XS->new->utf8->canonical;
my $result=eval {
    my $task=$json->decode($directory->child('request.json')->slurp_raw);
    my $operation=$task->{operation};
    my $request=$task->{request};
    die "Invalid store request\n" unless ref($request) eq 'HASH';
    my $data;
    if ($operation eq 'latest') {$data=latest_release()}
    elsif ($operation eq 'download') {$data=download_release($task->{root},$request->{tag})}
    elsif ($operation eq 'import') {$data=merge_collections($task->{root},$request)}
    else {die "Unknown store operation\n"}
    +{ok=>JSON::XS::true,data=>$data};
} || {ok=>JSON::XS::false,error=>"$@"};
write_atomically(''.$directory->child('result.json'),sub {path($_[0])->spew_raw($json->encode($result))});
