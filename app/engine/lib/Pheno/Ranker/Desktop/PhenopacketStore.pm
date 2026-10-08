package Pheno::Ranker::Desktop::PhenopacketStore;

use strict;
use warnings;
use Exporter 'import';
use Digest::SHA;
use Fcntl qw(:flock);
use File::Temp qw(tempdir);
use IO::Uncompress::Unzip qw($UnzipError);
use JSON::XS;
use Mojo::UserAgent;
use Path::Tiny qw(path);
use Pheno::Ranker::Desktop::Atomic qw(write_atomically);

our @EXPORT_OK = qw(cached_releases latest_release download_release merge_collections);
my $JSON=JSON::XS->new->utf8->canonical;
my $API='https://api.github.com/repos/monarch-initiative/phenopacket-store/releases';
my $DOWNLOAD='https://github.com/monarch-initiative/phenopacket-store/releases/download';

sub _tag {
    my ($tag)=@_;
    die "Invalid Phenopacket Store release tag\n" unless defined($tag) && !ref($tag) && $tag =~ /\A[vV]?\d+(?:\.\d+){1,3}(?:-[A-Za-z0-9.-]+)?\z/ && length($tag)<80;
    return $tag;
}
sub _root { my $root=path($_[0],'phenopacket-store'); $root->mkpath({mode=>0700}); return $root }
sub _sha { my $sha=Digest::SHA->new(256); $sha->addfile("$_[0]"); return $sha->hexdigest }
sub _write { my ($file,$data)=@_; write_atomically("$file",sub {path($_[0])->spew_raw($JSON->encode($data))}) }
sub _get {
    my ($url,$max,%args)=@_;
    my $ua=$args{ua} || Mojo::UserAgent->new;
    $ua->max_redirects(5)->max_response_size($max)->connect_timeout(15)->inactivity_timeout(45)->request_timeout(180);
    my $tx=$ua->get($url=>{'User-Agent'=>'Pheno-Ranker-Desktop','Accept'=>'application/vnd.github+json'});
    die "Phenopacket Store download failed: ".($tx->error->{message} || 'unknown error')."\n" if $tx->error;
    die "Phenopacket Store response is too large\n" if length($tx->res->body)>$max;
    return $tx->res->body;
}
sub _release {
    my ($suffix,%args)=@_;
    my $data=$JSON->decode(_get("$API/$suffix",2*1024*1024,%args));
    my $tag=_tag($data->{tag_name});
    my ($asset)=grep {($_->{name} || '') eq 'all_phenopackets.zip'} @{$data->{assets} || []};
    die "This release has no phenopacket archive\n" unless $asset && ($asset->{size} || 0)>0 && $asset->{size}<=100*1024*1024;
    my $url="$DOWNLOAD/$tag/all_phenopackets.zip";
    die "Unexpected Phenopacket Store asset URL\n" unless ($asset->{browser_download_url} || '') eq $url;
    my $digest=$asset->{digest};
    die "Release has no SHA-256 checksum; cannot verify download\n" unless defined($digest) && $digest =~ /\Asha256:([a-f0-9]{64})\z/;
    return {tag=>$tag,url=>$url,bytes=>0+$asset->{size},sha256=>$1};
}
sub latest_release { return _release('latest',@_) }
sub cached_releases {
    my ($root)=@_;
    my @releases;
    for my $dir (sort {$a cmp $b} _root($root)->children) {
        next unless -d $dir && -f $dir->child('index.json');
        my $index=eval {$JSON->decode($dir->child('index.json')->slurp_raw)};
        next unless $index && eval {_tag($index->{tag}); 1} && $dir->basename eq $index->{tag};
        push @releases,$index;
    }
    return \@releases;
}

# Read entries without extracting paths supplied by the archive. Bound both
# individual entries and total decompressed bytes before decoding JSON.
sub _records {
    my ($zip,$tag,$visit)=@_;
    my $reader=IO::Uncompress::Unzip->new("$zip",Strict=>1) or die "Invalid archive: $UnzipError\n";
    my ($bytes,$entries,$records)=(0,0,0);
    my %ids;
    while (1) {
        die "Archive contains too many entries\n" if ++$entries>100_000;
        my $name=$reader->getHeaderInfo->{Name};
        die "Unsafe archive path\n" if $name =~ m{(?:\A/|\\|(?:\A|/)\.\.(?:/|\z))};
        my $content='';
        while (1) {
            my $n=$reader->read(my $chunk,65536);
            die "Cannot read archive: $UnzipError\n" if $n<0;
            last if !$n;
            $bytes+=$n; $content.=$chunk;
            die "Archive exceeds decompression limits\n" if $bytes>512*1024*1024 || length($content)>5*1024*1024;
        }
        if ($name =~ /\.json\z/) {
            die "Unexpected phenopacket archive layout\n" unless $name =~ m{\A\Q$tag\E/([^/]+)/[^/]+\.json\z};
            my $collection=$1;
            my $record=eval {$JSON->decode($content)};
            die "Invalid phenopacket in $name\n" unless ref($record) eq 'HASH' && ref($record->{subject}) eq 'HASH'
              && defined($record->{id}) && !ref($record->{id}) && length($record->{id}) && $record->{id} !~ /[\r\n\t\0]/;
            die "Duplicate phenopacket id <$record->{id}> in $name and $ids{$record->{id}}\n" if exists $ids{$record->{id}};
            $ids{$record->{id}}=$name;
            die "Archive contains too many records\n" if ++$records>50_000;
            $visit->($collection,$record,$name);
        }
        my $next=$reader->nextStream;
        die "Invalid archive stream: $UnzipError\n" if $next<0;
        last unless $next;
    }
    die "Archive contains no phenopackets\n" unless $records;
}

sub download_release {
    my ($root,$tag,%args)=@_;
    _tag($tag);
    my $base=_root($root);
    open my $lock,'>>',$base->child('.lock') or die "Cannot lock release cache\n";
    flock($lock,LOCK_EX | LOCK_NB) or die "Another release download is already running\n";
    my $dest=$base->child($tag);
    if (-f $dest->child('index.json')) {
        my $index=$JSON->decode($dest->child('index.json')->slurp_raw);
        die "Cached archive checksum mismatch\n" unless _sha($dest->child('archive.zip')) eq $index->{sha256};
        return $index;
    }
    my $release=_release("tags/$tag",%args);
    die "Release tag mismatch\n" unless $release->{tag} eq $tag;
    my $temp=path(tempdir('download-XXXXXXXX',DIR=>"$base",CLEANUP=>1));
    my $zip=$temp->child('archive.zip');
    $zip->spew_raw(_get($release->{url},100*1024*1024,%args));
    die "Archive checksum or size mismatch\n" unless -s $zip == $release->{bytes} && _sha($zip) eq $release->{sha256};
    my (%counts,$records);
    _records($zip,$tag,sub {$counts{$_[0]}++; $records++});
    my $index={%$release,records=>$records,collections=>[map {{name=>$_,records=>$counts{$_}}} sort keys %counts]};
    _write($temp->child('index.json'),$index);
    rename "$temp","$dest" or die "Cannot publish release cache\n";
    return $index;
}

sub merge_collections {
    my ($root,$request)=@_;
    die "Invalid collection request\n" unless ref($request) eq 'HASH';
    my $tag=_tag($request->{tag});
    my $dir=_root($root)->child($tag);
    die "Download this release first\n" unless -f $dir->child('index.json');
    my $index=$JSON->decode($dir->child('index.json')->slurp_raw);
    die "Cached archive checksum mismatch\n" unless _sha($dir->child('archive.zip')) eq $index->{sha256};
    my $selection=$request->{collections};
    die "Select at least one collection\n" unless ref($selection) eq 'ARRAY' && @$selection && @$selection<=5000;
    my %available=map {$_->{name}=>1} @{$index->{collections}};
    die "Unknown collection in this release\n" if grep {ref($_) || !defined($_) || !$available{$_}} @$selection;
    my %selected=map {$_=>1} @$selection;
    my $parent=_root($root)->child('imports'); $parent->mkpath({mode=>0700});
    my $temp=path(tempdir('cohort-XXXXXXXX',DIR=>"$parent",CLEANUP=>0));
    my $file=$temp->child("phenopacket-store-$tag.json");
    my (%membership,$count);
    eval {
        write_atomically("$file",sub {
            open my $out,'>:raw',$_[0] or die "Cannot write cohort\n";
            print {$out} '[';
            _records($dir->child('archive.zip'),$tag,sub {
                my ($collection,$record)=@_;
                return unless $selected{$collection};
                print {$out} ',' if $count++;
                print {$out} $JSON->encode($record);
                $membership{$record->{id}}=$collection;
            });
            print {$out} "]\n";
            close $out or die "Cannot finish cohort\n";
        });
        _write(path("$file.provenance.json"),{
            format=>'pheno-ranker-phenopacket-store',version=>1,release=>$tag,
            source=>$index->{url},archiveSha256=>$index->{sha256},sha256=>_sha($file),
            collections=>[sort keys %selected],records=>$count,membership=>\%membership,
            citation=>'Danis et al. (2025). A corpus of GA4GH phenopackets: Case-level phenotyping for genomic diagnostics and discovery.',
        });
        1;
    } or do {my $error=$@; $temp->remove_tree; die $error};
    return {path=>"$file",records=>$count,collections=>scalar(keys %selected),tag=>$tag};
}
1;
