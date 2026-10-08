use strict;
use warnings;
use lib qw(lib app/engine/lib);
use Test::More;
use File::Temp qw(tempdir);
use Path::Tiny qw(path);
use Text::CSV_XS;
use JSON::XS ();
use Pheno::Ranker::Desktop::Alignment;

my $tmp = tempdir(CLEANUP => 1);
my $file = path($tmp, 'alignment.target.csv');
my $csv = Text::CSV_XS->new({binary => 1, sep_char => ';', eol => "\r\n"});
open my $fh, '>:encoding(UTF-8)', $file or die $!;
$csv->print($fh, [qw(id ref indicator tar weight hamming-distance json-path label)]);
my $label = "Quoted; \"label\"\nwith caf\x{e9}";
$csv->print($fh, ['ORPHA:1', 1, 'xxx--', 0, 3, 3, 'diseases.MONDO:1', $label]);
for (1 .. 33000) {
    $csv->print($fh, ['ORPHA:10', 1, '-----', 1, 1, 0, 'phenotypicFeatures.HP:1', 'x' x 1100]);
}
$csv->print($fh, ['ORPHA:1', 1, '-----', 1, 1, 0, 'phenotypicFeatures.HP:2', 'Feature']);
close $fh or die $!;
ok -s $file > 32 * 1024 * 1024, 'test alignment exceeds former whole-file limit';
my $pair = Pheno::Ranker::Desktop::Alignment::read_pair($file, 'ORPHA:1');
is scalar(@{$pair->{rows}}), 2, 'returns every exact match, including nonadjacent rows';
is_deeply $pair->{rows}[0], {ref => '1', tar => '0', weight => '3', distance => 3,
    path => 'diseases.MONDO:1', label => $label, entity => 'diseases'}, 'preserves quoting, Unicode, entities and weighted distances';
is scalar(@{Pheno::Ranker::Desktop::Alignment::read_pair($file, 'unknown')->{rows}}), 0, 'missing ID returns no rows';
eval {Pheno::Ranker::Desktop::Alignment::read_pair($file, 'ORPHA:10')};
like $@, qr/This pair exceeds/, 'retains a size limit for the selected pair';
eval {Pheno::Ranker::Desktop::Alignment::read_pair($file, [])};
like $@, qr/reference ID/, 'rejects invalid reference IDs';
my $bad = path($tmp, 'bad.csv');
$bad->spew_raw("id;ref\na;1\n");
eval {Pheno::Ranker::Desktop::Alignment::read_pair($bad, 'a')};
like $@, qr/required columns/, 'rejects incomplete header';
$bad->spew_raw("id;ref;tar;weight;hamming-distance;json-path;label\na;1;0;1;1;diseases.A;\"unterminated\n");
eval {Pheno::Ranker::Desktop::Alignment::read_pair($bad, 'a')};
like $@, qr/Malformed alignment/, 'rejects malformed CSV rather than displaying partial results';

# Serve a completed run using temporary outputs, including the normal artifact checks.
my $state = path($tmp, 'runs');
my $id = 'a' x 40;
my $run = $state->child($id); $run->mkpath;
my $json = JSON::XS->new->utf8;
my $status = {id => $id, conversion => 'patient', status => 'completed', created => time,
    directory => "$tmp", sources => [], options => {}, result => {artifacts => [
        {id => 'alignment', filename => 'alignment.target.csv', bytes => -s $file, kind => 'csv', mediaType => 'text/csv'},
    ], warnings => []}};
$run->child('status.json')->spew_raw($json->encode($status));
require Test::Mojo;
local $ENV{PHENO_RANKER_API_TOKEN} = 'p' x 32;
local $ENV{PHENO_RANKER_STATE_DIR} = "$state";
require './app/engine/main.pl';
my $t = Test::Mojo->new(main::app());
my $auth = {Authorization => 'Bearer ' . $ENV{PHENO_RANKER_API_TOKEN}};
$t->post_ok("/api/jobs/$id/alignment" => $auth => json => {reference => 'ORPHA:1'})->status_is(200)
  ->json_is('/data/rows', $pair->{rows});
$t->post_ok("/api/jobs/$id/alignment" => json => {reference => 'ORPHA:1'})->status_is(401);
$file->append_raw("changed\n");
$t->post_ok("/api/jobs/$id/alignment" => $auth => json => {reference => 'ORPHA:1'})->status_is(422);
done_testing;
