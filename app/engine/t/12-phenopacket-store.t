use strict;
use warnings;
use lib qw(lib app/engine/lib);
use Test::More;
use File::Temp qw(tempdir);
use IO::Compress::Zip;
use JSON::XS ();
use Path::Tiny qw(path);
use Digest::SHA qw(sha256_hex);
use Cwd qw(abs_path);
use Pheno::Ranker::Desktop::PhenopacketStore qw(cached_releases latest_release download_release merge_collections);
use Pheno::Ranker::Desktop::Service qw(execute_files);
use Pheno::Ranker::Desktop::Jobs;
use Pheno::Ranker::Desktop::Projects;

my $tmp=tempdir(CLEANUP=>1);
my $json=JSON::XS->new->utf8->canonical;
my @packets=map {{id=>"case-$_",subject=>{id=>"subject-$_"},phenotypicFeatures=>[{type=>{id=>"HP:000000$_",label=>"Feature $_"}}]}} 1..3;
sub archive {
    my (@entries)=@_;
    my $bytes='';
    my $zip=IO::Compress::Zip->new(\$bytes,Name=>$entries[0][0]) or die $IO::Compress::Zip::ZipError;
    for my $i (0..$#entries) {
        $zip->newStream(Name=>$entries[$i][0]) or die $IO::Compress::Zip::ZipError if $i;
        $zip->print($entries[$i][1]) or die $IO::Compress::Zip::ZipError;
    }
    $zip->close or die $IO::Compress::Zip::ZipError;
    return $bytes;
}
my $bytes=archive(['0.1.27/GENE_A/one.json',$json->encode($packets[0])],
    ['0.1.27/GENE_B/two.json',$json->encode($packets[1])],['0.1.27/GENE_B/three.json',$json->encode($packets[2])]);
my $calls=0;
my $metadata={tag_name=>'0.1.27',assets=>[{name=>'all_phenopackets.zip',size=>length($bytes),
    digest=>'sha256:'.sha256_hex($bytes),browser_download_url=>'https://github.com/monarch-initiative/phenopacket-store/releases/download/0.1.27/all_phenopackets.zip'}]};
{
    no warnings 'redefine';
    local *Pheno::Ranker::Desktop::PhenopacketStore::_get=sub {
        $calls++; return $_[0] =~ /\.zip$/ ? $bytes : $json->encode($metadata);
    };
    is latest_release()->{tag},'0.1.27','resolves latest to an explicit version';
    my $index=download_release($tmp,'0.1.27');
    is $index->{records},3,'indexes individual JSONs';
    is_deeply $index->{collections},[{name=>'GENE_A',records=>1},{name=>'GENE_B',records=>2}], 'collections belong to selected release';
    my $before=$calls;
    download_release($tmp,'0.1.27');
    is $calls,$before,'cached release loads without network';
}
is scalar(@{cached_releases($tmp)}),1,'lists downloaded releases offline';
my $merged=merge_collections($tmp,{tag=>'0.1.27',collections=>['GENE_B','GENE_A']});
is $merged->{records},3,'all selected collections become one cohort';
my $file=path($merged->{path});
is_deeply $json->decode($file->slurp_raw),\@packets,'records and original IDs are unchanged';
my $provenance=$json->decode(path("$file.provenance.json")->slurp_raw);
is_deeply $provenance->{membership},{'case-1'=>'GENE_A','case-2'=>'GENE_B','case-3'=>'GENE_B'},'collection labels are separate from phenopackets';
is $provenance->{sha256},sha256_hex($file->slurp_raw),'provenance identifies exact combined input';
is $provenance->{archiveSha256},sha256_hex($bytes),'provenance records downloaded archive checksum';
my $again=merge_collections($tmp,{tag=>'0.1.27',collections=>['GENE_A','GENE_B']});
is path($again->{path})->slurp_raw,$file->slurp_raw,'selection order does not change generated data';
my $subset=merge_collections($tmp,{tag=>'0.1.27',collections=>['GENE_B']});
is $subset->{records},2,'can select a single collection';
for my $selection ([],['unknown']) {
    eval {merge_collections($tmp,{tag=>'0.1.27',collections=>$selection})};
    like $@,qr/Select at least|Unknown collection/,'rejects invalid selection without a partial cohort';
}
eval {download_release($tmp,'../../escape')};
like $@,qr/Invalid.*tag/,'rejects path traversal in version';

for my $bad (
    [archive(['../escape.json','{}']),qr/Unsafe archive/],
    [archive(['0.1.27/A/1.json',$json->encode($packets[0])],['0.1.27/B/2.json',$json->encode($packets[0])]),qr/Duplicate phenopacket/],
    [archive(['0.1.27/A/1.json','{invalid']),qr/Invalid phenopacket/],
) {
    my $root=tempdir(DIR=>$tmp,CLEANUP=>1);
    no warnings 'redefine';
    local *Pheno::Ranker::Desktop::PhenopacketStore::_get=sub {
        return $bad->[0] if $_[0] =~ /\.zip$/;
        return $json->encode({%$metadata,assets=>[{%{$metadata->{assets}[0]},size=>length($bad->[0]),digest=>'sha256:'.sha256_hex($bad->[0])}]});
    };
    eval {download_release($root,'0.1.27')};
    like $@,$bad->[1],'rejects unsafe or invalid archive';
    is scalar(@{cached_releases($root)}),0,'invalid archive is not published';
}
{
    no warnings 'redefine';
    local *Pheno::Ranker::Desktop::PhenopacketStore::_get=sub {$_[0] =~ /\.zip$/ ? 'broken' : $json->encode($metadata)};
    eval {download_release(tempdir(DIR=>$tmp,CLEANUP=>1),'0.1.27')};
    like $@,qr/checksum or size mismatch/,'rejects corrupted download';
}

my $out=path($tmp,'outputs'); $out->mkpath;
my $result=execute_files('cohort',{options=>{'include-terms'=>['phenotypicFeatures'],mds=>JSON::XS::false,'cytoscape-json'=>JSON::XS::false}},
    {reference=>[{path=>"$file",filename=>$file->basename}]},{directory=>"$out"});
ok -s $out->child('matrix.txt'),'merged array runs through the unchanged CLI';
ok -s $out->child('collection-labels.json'),'analysis publishes collection metadata';
my $plain=path($tmp,'plain.json'); $plain->spew_raw($file->slurp_raw);
my $plain_out=path($tmp,'plain-output'); $plain_out->mkpath;
execute_files('cohort',{options=>{'include-terms'=>['phenotypicFeatures'],mds=>JSON::XS::false,'cytoscape-json'=>JSON::XS::false}},
    {reference=>[{path=>"$plain",filename=>'plain.json'}]},{directory=>"$plain_out"});
is $out->child('matrix.txt')->slurp_raw,$plain_out->child('matrix.txt')->slurp_raw,'collection labels do not affect distances';

my $jobs=Pheno::Ranker::Desktop::Jobs->new(root=>"$tmp/project-jobs",worker=>abs_path('app/engine/worker.pl'));
my $handle=$jobs->register_file("$file"); $jobs->{project_owned}{$handle->{id}}=1;
my $project="$tmp/test.phenoranker";
Pheno::Ranker::Desktop::Projects::save($jobs,$project,{settings=>{conversion=>'cohort',options=>{},output=>{}},files=>{reference=>[$handle->{id}]},runs=>[]});
my $saved=$json->decode(path($project)->slurp_raw);
my $saved_input=path($tmp,$saved->{sources}{reference}[0]{path});
is_deeply $json->decode(path("$saved_input.provenance.json")->slurp_raw)->{membership},$provenance->{membership},'saved project retains collection membership independently of cache';
$jobs->shutdown;

require Test::Mojo;
local $ENV{PHENO_RANKER_API_TOKEN}='p' x 32;
local $ENV{PHENO_RANKER_STATE_DIR}=$tmp;
require './app/engine/main.pl';
my $t=Test::Mojo->new(main::app());
$t->get_ok('/api/phenopacket-store/cached')->status_is(401);
my $headers={Authorization=>'Bearer '.('p' x 32)};
$t->get_ok('/api/phenopacket-store/cached'=>$headers)->status_is(200)->json_is('/data/0/records',3);
$t->post_ok('/api/phenopacket-store/import'=>$headers=>json=>{tag=>'0.1.27',collections=>['GENE_A']})->status_is(200)->json_is('/data/records',1);
ok $t->tx->res->json->{data}{files}[0]{id},'portable worker returns a parent-registered file handle';
path($tmp,'phenopacket-store','0.1.27','archive.zip')->append_raw('tampered');
eval {merge_collections($tmp,{tag=>'0.1.27',collections=>['GENE_A']})};
like $@,qr/checksum mismatch/,'detects tampering before reuse';
done_testing;
