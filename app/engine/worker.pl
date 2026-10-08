#!/usr/bin/env perl
use strict;
use warnings;
use FindBin qw($Bin);
use lib "$Bin/lib", "$Bin/../../lib";
use File::Spec;
use POSIX ();
POSIX::setsid() >= 0 or die "Cannot create job process group: $!" unless $^O eq 'MSWin32';
open STDOUT, '>', File::Spec->devnull or die 'Cannot isolate worker output';
open STDERR, '>', File::Spec->devnull or die 'Cannot isolate worker errors';
use Pheno::Ranker::Desktop::Jobs;
exit(Pheno::Ranker::Desktop::Jobs->perform($ARGV[0]) ? 0 : 1);
