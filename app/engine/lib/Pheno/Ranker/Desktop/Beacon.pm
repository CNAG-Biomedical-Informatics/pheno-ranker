package Pheno::Ranker::Desktop::Beacon;

use strict;
use warnings;
use Exporter 'import';
use Digest::SHA qw(sha256_hex);
use File::Temp qw(tempdir);
use JSON::XS;
use Mojo::URL;
use Mojo::UserAgent;
use Path::Tiny qw(path);
use POSIX qw(strftime);
use Pheno::Ranker::Desktop::Atomic qw(write_atomically);

our @EXPORT_OK = qw(import_individuals discover_filters);
my $JSON = JSON::XS->new->utf8->canonical->pretty;
my $MAX_RESPONSE_BYTES = 50 * 1024 * 1024;
my $MAX_RECORDS = 10_000;

sub _url {
    my ($value)=@_;
    die "Provide a Beacon API base URL\n" unless defined($value) && !ref($value) && length($value)<=2048;
    my $url=Mojo::URL->new($value);
    my $host=$url->host || '';
    die "Beacon URL must not contain credentials, a query, or a fragment\n"
      if $url->userinfo || defined($url->query->to_string) && length($url->query->to_string) || $url->fragment;
    die "Beacon URL must use HTTPS\n"
      unless ($url->scheme || '') eq 'https'
      || (($url->scheme || '') eq 'http' && $host =~ /\A(?:localhost|127(?:\.\d{1,3}){3}|\[?::1\]?)\z/i);
    die "Beacon URL requires a host\n" unless length $host;
    $url->path->trailing_slash(0);
    return $url;
}

sub _headers {
    my ($token)=@_;
    return {} unless defined($token) && length($token);
    die "Invalid Beacon bearer token\n" if ref($token) || length($token)>8192 || $token =~ /[\r\n\0]/;
    return {Authorization=>"Bearer $token"};
}

sub _json_response {
    my ($tx,$context)=@_;
    my $response=$tx->res;
    die "$context failed: ".(defined($response->code) ? 'HTTP '.$response->code : 'connection unavailable or timed out')."\n" unless $response->is_success;
    die "$context response exceeds 50 MiB\n" if length($response->body || '')>$MAX_RESPONSE_BYTES;
    my $value=eval {$response->json};
    die "$context did not return a JSON object\n" unless ref($value) eq 'HASH';
    return $value;
}

sub _request {
    my ($ua, $method, $url, $headers, $query) = @_;
    my $tx = $method eq 'post' ? $ua->post($url => $headers => json => $query) : $ua->get($url => $headers);
    if (($tx->res->code || 0) =~ /\A30[78]\z/) {
        my $location = $tx->res->headers->location;
        die "Beacon returned an invalid redirect\n" unless defined $location;
        my $next = Mojo::URL->new($location)->to_abs($url);
        # Permit only trailing-slash normalization, retaining POST and credentials.
        my $expected = $url->clone; $expected->path->trailing_slash(1);
        die "Beacon redirected to an unexpected endpoint\n" unless "$next" eq "$expected" && "$next" ne "$url";
        return $method eq 'post' ? $ua->post($next => $headers => json => $query) : $ua->get($next => $headers);
    }
    return $tx;
}

sub _endpoint {
    my ($ua,$base,$headers)=@_;
    return $base if $base->path->to_string =~ m{/individuals\z};
    my $map_url=Mojo::URL->new("$base/map");
    my $tx=_request($ua,'get',$map_url,$headers);
    return Mojo::URL->new("$base/individuals") if ($tx->res->code || 0)==404;
    my $map=_json_response($tx,'Beacon map discovery');
    my $sets=$map->{endpointSets} || $map->{response}{endpointSets};
    my $root=ref($sets) eq 'HASH' && ref($sets->{individualEndpoints}) eq 'HASH'
      ? $sets->{individualEndpoints}{rootUrl} : undef;
    if (!defined($root) && ref($sets) eq 'HASH') {
        my ($entry) = grep {ref($_) eq 'HASH' && ($_->{entryType} || '') eq 'individual'} values %$sets;
        $root = $entry->{rootUrl} if $entry;
    }
    die "Beacon map does not advertise an individuals endpoint\n" unless defined($root) && !ref($root);
    my $endpoint=Mojo::URL->new($root)->to_abs($base);
    my $checked=_url("$endpoint");
    die "Beacon map redirected individuals to another host\n"
      unless lc($checked->host) eq lc($base->host) && $checked->scheme eq $base->scheme && $checked->port == $base->port;
    return $checked;
}

sub _next_page {
    my ($response)=@_;
    for my $pagination (
        $response->{meta}{receivedRequestSummary}{pagination},
        $response->{response}{pagination},
    ) {
        return $pagination->{nextPage}
          if ref($pagination) eq 'HASH' && defined($pagination->{nextPage})
          && !ref($pagination->{nextPage}) && length($pagination->{nextPage});
    }
    return;
}

sub discover_filters {
    my ($request,%args)=@_;
    die "Beacon discovery must be an object\n" unless ref($request) eq 'HASH';
    my $base=_url($request->{url});
    my $headers=_headers($request->{token});
    my $ua=$args{ua} || Mojo::UserAgent->new;
    $ua->max_redirects(0)->connect_timeout(10)->inactivity_timeout(30)->request_timeout(60);
    my $endpoint=_endpoint($ua,$base,$headers);
    my $tx=_request($ua,'get',Mojo::URL->new("$endpoint/filtering_terms"),$headers);
    if (($tx->res->code || 0)==404) {
        (my $root="$endpoint") =~ s{/individuals$}{};
        $tx=_request($ua,'get',Mojo::URL->new("$root/filtering_terms"),$headers);
    }
    my $response=_json_response($tx,'Beacon filter discovery');
    my $terms=$response->{response}{filteringTerms};
    die "Beacon does not advertise filtering terms; enter identifiers manually\n" unless ref($terms) eq 'ARRAY';
    my (@terms,%seen);
    for my $term (@$terms) {
        next unless ref($term) eq 'HASH' && defined($term->{id}) && !ref($term->{id})
          && length($term->{id}) && length($term->{id})<=512 && $term->{id} !~ /[\r\n\0]/;
        # Value filters require operators and are not selectable as ontology terms.
        next if ($term->{type} || '') =~ /alphanumeric|numeric/i;
        next if $seen{$term->{id}}++;
        push @terms,{id=>$term->{id},label=>!ref($term->{label}) ? ($term->{label} || $term->{id}) : $term->{id}};
        last if @terms>=10_000;
    }
    return {terms=>\@terms};
}

sub import_individuals {
    my ($jobs,$request,%args)=@_;
    die "Beacon import must be an object\n" unless ref($request) eq 'HASH';
    my %allowed=map {$_=>1} qw(url token filters maxPages pageSize allowPartial);
    die "Unknown Beacon import field\n" if grep {!$allowed{$_}} keys %$request;
    my $base=_url($request->{url});
    my $headers=_headers($request->{token});
    my $filters=$request->{filters} || [];
    die "Beacon filters must be a list of up to 100 values\n"
      unless ref($filters) eq 'ARRAY' && @$filters<=100
      && !grep {!defined($_) || ref($_) || !length($_) || length($_)>512 || /[\r\n\0]/} @$filters;
    my $max_pages=$request->{maxPages} // 10;
    my $page_size=$request->{pageSize} // 100;
    die "Beacon allowPartial must be a boolean\n" if exists($request->{allowPartial})
      && !JSON::XS::is_bool($request->{allowPartial});
    my $limited=JSON::XS::false;
    die "Beacon maxPages must be between 1 and 100\n" unless "$max_pages" =~ /\A\d+\z/ && $max_pages>=1 && $max_pages<=100;
    die "Beacon pageSize must be between 1 and 1000\n" unless "$page_size" =~ /\A\d+\z/ && $page_size>=1 && $page_size<=1000;
    my $ua=$args{ua} || Mojo::UserAgent->new;
    $ua->max_redirects(0)->connect_timeout(10)->inactivity_timeout(30)->request_timeout(60);
    my $endpoint=_endpoint($ua,$base,$headers);
    my $query={meta=>{apiVersion=>'v2.0'},query=>{
        requestedGranularity=>'record',includeResultsetResponses=>'ALL',
        pagination=>{limit=>0+$page_size},(@$filters ? (filters=>[map {{id=>$_}} @$filters]) : ()),
    }};
    my $provenance_query=$JSON->decode($JSON->encode($query));
    my (%sets,%seen_pages,%seen_ids,$next_page);
    my $skip = 0;
    my $pages=0;
    while (1) {
        $query->{query}{pagination}{currentPage}=$next_page if defined $next_page;
        $query->{query}{pagination}{skip} = $skip unless defined $next_page;
        my $response=_json_response(_request($ua,'post',$endpoint,$headers,$query),'Beacon individuals query');
        die "Beacon did not return record-level results\n"
          if ($response->{meta}{returnedGranularity} || 'record') ne 'record';
        my $result_sets=$response->{response}{resultSets};
        die "Beacon response does not contain resultSets\n" unless ref($result_sets) eq 'ARRAY';
        for my $set (@$result_sets) {
            die "Invalid Beacon resultSet\n" unless ref($set) eq 'HASH';
            my $id=defined($set->{id}) && !ref($set->{id}) && length($set->{id}) ? $set->{id} : 'default';
            my $results=$set->{results} || [];
            die "Invalid Beacon individual results\n" unless ref($results) eq 'ARRAY' && !grep {ref($_) ne 'HASH'} @$results;
            for my $record (@$results) {
                my $record_id = $record->{id};
                die "Every imported Beacon individual requires a unique id; pagination may have repeated records\n"
                  unless defined($record_id) && !ref($record_id) && length($record_id) && !$seen_ids{$id}{$record_id}++;
            }
            push @{$sets{$id}{results}}, @$results;
            $sets{$id}{setType}=$set->{setType} if defined($set->{setType}) && !ref($set->{setType});
        }
        $pages++;
        $next_page=_next_page($response);
        if (!defined $next_page) {
            my $pagination = $response->{meta}{receivedRequestSummary}{pagination} || {};
            my $limit = $pagination->{limit};
            last unless defined($pagination->{skip}) && defined($limit) && !ref($limit)
              && "$limit" =~ /\A[1-9]\d*\z/ && grep {@{$_->{results} || []} >= $limit} @$result_sets;
            die "Beacon did not honor pagination offset\n" unless $pagination->{skip} == $skip;
            $skip += $limit;
            delete $query->{query}{pagination}{currentPage};
        }
        die "Beacon repeated a pagination token\n" if defined($next_page) && $seen_pages{$next_page}++;
        if ($pages >= $max_pages) {
            die "Beacon import reached maxPages before completion\n" unless $request->{allowPartial};
            $limited=JSON::XS::true;
            last;
        }
        my $count=0; $count+=@{$_->{results} || []} for values %sets;
        die "Beacon import exceeds 10,000 records\n" if $count>$MAX_RECORDS;
    }
    my $count=0; $count+=@{$_->{results} || []} for values %sets;
    die "Beacon query returned no individual records\n" unless $count;
    die "Beacon import exceeds 10,000 records\n" if $count>$MAX_RECORDS;

    my $parent=path($jobs->{root},'beacon-imports'); $parent->mkpath({mode=>0700});
    my $directory=path(tempdir('import-XXXXXXXX',DIR=>"$parent",CLEANUP=>0));
    my (@files,%names);
    for my $set_id (sort keys %sets) {
        my $records=$sets{$set_id}{results};
        next unless @$records;
        my %ids;
        for my $record (@$records) {
            my $id=$record->{id};
            die "Every imported Beacon individual requires a unique id\n"
              unless defined($id) && !ref($id) && length($id) && !$ids{$id}++;
        }
        (my $name=$set_id)=~s/[^A-Za-z0-9._-]+/_/g;
        $name='individuals' unless length($name) && $name ne '.' && $name ne '..';
        $name.='-'.substr(sha256_hex($set_id),0,8) if $names{lc $name}++;
        my $file=$directory->child("$name.json");
        my $payload=$JSON->encode($records);
        write_atomically("$file",sub {path($_[0])->spew_raw($payload)});
        my $provenance={format=>'pheno-ranker-beacon-import',version=>1,
            endpoint=>"$endpoint",query=>$provenance_query,pages=>$pages,resultSet=>$set_id,
            pageLimitReached=>$limited,pageSize=>0+$page_size,maxPages=>0+$max_pages,
            setType=>$sets{$set_id}{setType},records=>scalar(@$records),sha256=>sha256_hex($payload),
            fetchedAt=>strftime('%Y-%m-%dT%H:%M:%SZ',gmtime)};
        write_atomically("$file.provenance.json",sub {path($_[0])->spew_raw($JSON->encode($provenance))});
        my $handle=$jobs->register_file("$file");
        $jobs->{project_owned}{$handle->{id}}=1;
        push @files,$handle;
    }
    return {files=>\@files,pages=>$pages,records=>$count,endpoint=>"$endpoint",pageLimitReached=>$limited};
}

1;
