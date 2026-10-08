#!/usr/bin/env perl

use strict;
use warnings;

use Mojolicious::Lite;
use Cwd qw(abs_path);
use File::Basename qw(dirname);
use File::Find qw(find);
use File::Spec::Functions qw(catdir catfile);
use File::Temp qw(tempdir);
use IO::Compress::Zip qw($ZipError);
use MIME::Base64 qw(encode_base64);
use IPC::Open3 qw(open3);
use Symbol qw(gensym);
use POSIX qw(WNOHANG);
use Path::Tiny ();

our $API_DIR;
BEGIN {
    $API_DIR = dirname( abs_path(__FILE__) );
    require lib;
    lib->import("$API_DIR/lib", "$API_DIR/../../lib");
}

use Pheno::Ranker::Desktop::Service qw(catalog health);
use Pheno::Ranker::Desktop::Beacon qw(import_individuals discover_filters);
use Pheno::Ranker::Desktop::PhenopacketStore qw(cached_releases latest_release download_release merge_collections);
use Pheno::Ranker::Desktop::CsvPreview qw(preview_csv);
use Pheno::Ranker::Desktop::Jobs;
use Mojo::Util qw(secure_compare);
use Mojo::File ();
use Mojo::JSON qw(decode_json false);

my $MAX_UPLOAD_BYTES = $ENV{PHENO_RANKER_HTTP_MAX_UPLOAD_BYTES} || 100 * 1024 * 1024;
my $token = $ENV{PHENO_RANKER_API_TOKEN} || die "Set PHENO_RANKER_API_TOKEN before starting the API\n";
die "API token must contain at least 32 characters\n" if length($token) < 32;
my $jobs = Pheno::Ranker::Desktop::Jobs->new(
    root => $ENV{PHENO_RANKER_STATE_DIR} || catdir($ENV{HOME} || $ENV{LOCALAPPDATA} || '.', '.pheno-ranker', 'runs'),
    worker => catfile($API_DIR, 'worker.pl'),
);
END {
    # Reaping workers must not replace the server or test process exit status.
    local $?;
    $jobs->shutdown if $jobs;
}

hook before_dispatch => sub {
    my ($c) = @_;
    my $host = $c->req->url->to_abs->host || '';
    my %hosts = map { $_ => 1 } split /,/, ($ENV{PHENO_RANKER_API_HOSTS} || '127.0.0.1,localhost');
    unless ($hosts{$host}) {
        $c->app->log->warn("Rejected service host <$host>");
        return $c->render(status=>403,json=>{ok=>false,error=>{message=>'Unrecognized service host'}});
    }
    my $origin = $c->req->headers->origin;
    if (defined $origin) {
        my %origins = map { $_ => 1 } split /,/, ($ENV{PHENO_RANKER_API_ORIGINS} || 'tauri://localhost,http://tauri.localhost,https://tauri.localhost');
        unless ($origins{$origin}) {
            $c->app->log->warn("Rejected application origin <$origin>");
            return $c->render(status=>403,json=>{ok=>false,error=>{message=>'Unrecognized application origin'}});
        }
        $c->res->headers->header('Access-Control-Allow-Origin' => $origin);
        $c->res->headers->header('Vary' => 'Origin');
        $c->res->headers->header('Access-Control-Allow-Headers' => 'Authorization, Content-Type');
        $c->res->headers->header('Access-Control-Allow-Methods' => 'GET, POST, DELETE, OPTIONS');
        return $c->render(status=>204,text=>'') if $c->req->method eq 'OPTIONS';
    }
    return $c->render(status=>401,json=>{ok=>false,error=>{message=>'API authentication required'}})
      unless secure_compare($c->req->headers->authorization || '', "Bearer $token");
};

sub render_error {
    my ($c,$status,$code,$message)=@_;
    $c->render(status=>$status,json=>{ok=>false,error=>{code=>$code,message=>$message}});
}
get '/api/health' => sub { shift->render(json=>health()) };
get '/api/operations' => sub { shift->render(json=>catalog()) };
sub job_call {
    my ($c,$callback,$status)=@_;
    my $result=eval {$callback->()};
    if ($@) { my $message="$@"; $message =~ s/\s+at \S+ line \d+.*//s; return render_error($c,422,'invalid_request',$message) }
    return $c->render(status=>$status || 200,json=>{ok=>Mojo::JSON->true,data=>$result});
}

post '/api/shutdown' => sub {
    my $c = shift;
    my $local = $ENV{PHENO_RANKER_LOCAL_TOKEN};
    return render_error($c,403,'local_access_denied','Native shutdown is not authorized')
      unless $local && secure_compare($c->req->headers->header('X-Pheno-Ranker-Local') || '',$local);
    $jobs->shutdown;
    $c->render(json => {ok => Mojo::JSON->true});
    Mojo::IOLoop->timer(0.2 => sub { Mojo::IOLoop->stop });
};

post '/api/inputs/local' => sub {
    my $c=shift;
    my $local=$ENV{PHENO_RANKER_LOCAL_TOKEN};
    return render_error($c,403,'local_access_denied','Native file selection is not authorized')
      unless $local && secure_compare($c->req->headers->header('X-Pheno-Ranker-Local') || '',$local);
    job_call($c,sub {
        my $body=$c->req->json;
        die "Provide selected paths\n" unless ref($body) eq 'HASH' && ref($body->{paths}) eq 'ARRAY' && @{$body->{paths}} <=128;
        return [map {$jobs->register_file($_)} @{$body->{paths}}];
    },201);
};

post '/api/inputs' => sub {
    my $c=shift;
    job_call($c,sub {
        my $uploads=$c->req->uploads || [];
        die "Provide at least one file\n" unless @$uploads && @$uploads<=128;
        my $total=0; $total+=$_->size for @$uploads;
        die "Uploaded files exceed the request limit\n" if $total>$MAX_UPLOAD_BYTES;
        my $folder=tempdir('uploads-XXXXXX',DIR=>$jobs->{root},CLEANUP=>0);
        my @result;
        for my $upload (@$uploads) {
            my $name=$upload->filename || 'input'; $name =~ s{.*[\\/]}{}; $name =~ s{[^A-Za-z0-9._-]}{_}g;
            $name='input' if $name eq '.' || $name eq '..';
            my $file=catfile($folder,sprintf('%03d-',scalar @result).$name);
            $upload->move_to($file);
            push @result,$jobs->register_file($file);
        }
        return \@result;
    },201);
};

post '/api/beacon/filters' => sub {
    my $c=shift;
    job_call($c,sub {discover_filters($c->req->json)});
};

post '/api/beacon/import' => sub {
    my $c=shift;
    job_call($c,sub {import_individuals($jobs,$c->req->json)},201);
};

# Use a separate executable, not fork emulation, so this also works on Windows.
my %store_workers;
END {
    for my $pid (keys %store_workers) {kill 'TERM',$pid; waitpid($pid,0)}
}
sub store_call {
    my ($c,$operation,$request,$finish)=@_;
    return render_error($c,409,'store_busy','A Phenopacket Store operation is already running') if keys %store_workers;
    my $temp=Path::Tiny::path(tempdir('store-task-XXXXXXXX',DIR=>$jobs->{root},CLEANUP=>1));
    $temp->child('request.json')->spew_raw(Mojo::JSON::encode_json({operation=>$operation,root=>$jobs->{root},request=>$request}));
    my ($stdin,$stdout,$stderr)=(gensym(),gensym(),gensym());
    my $pid=eval {open3($stdin,$stdout,$stderr,$^X,catfile($API_DIR,'store-worker.pl'),"$temp")};
    return render_error($c,500,'store_error','Cannot start download worker') unless $pid;
    close $stdin;
    $store_workers{$pid}=1;
    $c->render_later;
    $c->inactivity_timeout(600);
    my $timer;
    $timer=Mojo::IOLoop->recurring(0.2=>sub {
        return if waitpid($pid,WNOHANG)==0;
        Mojo::IOLoop->remove($timer); delete $store_workers{$pid};
        close $stdout; close $stderr;
        my $result=eval {Mojo::JSON::decode_json($temp->child('result.json')->slurp_raw)};
        $temp->remove_tree;
        return render_error($c,422,'store_error',($result && $result->{error}) || 'Phenopacket Store worker stopped unexpectedly') unless $result && $result->{ok};
        job_call($c,sub {$finish ? $finish->($result->{data}) : $result->{data}});
    });
}
get '/api/phenopacket-store/cached' => sub {
    my $c=shift; job_call($c,sub {cached_releases($jobs->{root})});
};
post '/api/phenopacket-store/latest' => sub {
    my $c=shift; store_call($c,'latest',{});
};
post '/api/phenopacket-store/download' => sub {
    my $c=shift; my $request=$c->req->json || {};
    store_call($c,'download',$request);
};
post '/api/phenopacket-store/import' => sub {
    my $c=shift; my $request=$c->req->json;
    store_call($c,'import',$request,sub {
        my ($result)=@_;
        my $file=$jobs->register_file(delete $result->{path});
        $jobs->{project_owned}{$file->{id}}=1;
        return {%$result,files=>[$file]};
    });
};

get '/api/jobs' => sub { my $c=shift; job_call($c,sub {$jobs->list}) };
get '/api/jobs/settings' => sub { my $c=shift; job_call($c,sub {$jobs->settings}) };
post '/api/jobs/settings' => sub { my $c=shift; job_call($c,sub {$jobs->update_settings($c->req->json)}) };
post '/api/jobs/cancel-pending' => sub { my $c=shift; job_call($c,sub {$jobs->cancel_pending}) };
get '/api/inputs/:id/preview' => sub {my $c=shift; job_call($c,sub {$jobs->input_preview($c->param('id'))})};
post '/api/csv/preview' => sub {my $c=shift; job_call($c,sub {preview_csv($jobs,$c->req->json || {})})};
post '/api/terms' => sub {
    my $c=shift;
    job_call($c,sub {
        require Pheno::Ranker::Desktop::Terms;
        Pheno::Ranker::Desktop::Terms::choices($jobs, $c->req->json);
    });
};
post '/api/mappings' => sub {my $c=shift; job_call($c,sub {$jobs->save_mapping(($c->req->json || {})->{text})},201)};
post '/api/projects/local/:operation' => sub {
    my $c = shift;
    my $local = $ENV{PHENO_RANKER_LOCAL_TOKEN};
    return render_error($c,403,'local_access_denied','Native project access is not authorized')
      unless $local && secure_compare($c->req->headers->header('X-Pheno-Ranker-Local') || '', $local);
    job_call($c, sub {
        require Pheno::Ranker::Desktop::Projects;
        my $body = $c->req->json || {};
        my $file = $body->{handle} ? $jobs->resolve_grant($body->{handle}) : $body->{path};
        return Pheno::Ranker::Desktop::Projects::save($jobs, $file, $body->{data}) if $c->param('operation') eq 'save';
        return Pheno::Ranker::Desktop::Projects::open($jobs, $file) if $c->param('operation') eq 'open';
        die "Unknown project operation\n";
    });
};
post '/api/jobs' => sub { my $c=shift; job_call($c,sub {$jobs->submit($c->req->json)},202) };
post '/api/jobs/:id/projections' => sub {
    my $c=shift;
    job_call($c,sub {
        my $source=$jobs->status($c->param('id'));
        die "Select a completed cohort run\n" unless $source->{conversion} eq 'cohort' && $source->{status} eq 'completed';
        my $options=$c->req->json || {};
        die "Invalid projection settings\n" unless ref($options) eq 'HASH'
            && !grep {$_ !~ /\A(?:projection|n-neighbors|min-dist|seed)\z/} keys %$options;
        my ($matrix)=grep {$_->{filename} eq 'matrix.txt'} @{$source->{result}{artifacts} || []};
        die "A dense matrix is required for projections\n" unless $matrix;
        my ($file)=$jobs->artifact($source->{id},$matrix->{id});
        return $jobs->submit({conversion=>'projection',input=>{files=>{matrix=>[$jobs->register_file("$file")->{id}]}},
            options=>{%$options,'source-run'=>$source->{id}},output=>{}});
    },202);
};
post '/api/reference-plan' => sub {
    my $c=shift;
    job_call($c,sub {
        my $body=$c->req->json || {};
        my $selected=$body->{input}{files} || {};
        die "Provide selected input files\n" unless ref($selected) eq 'HASH';
        die "Options must be an object\n" unless ref($body->{options} || {}) eq 'HASH';
        my %files;
        for my $role (keys %$selected) {
            die "Selected files must be an array\n" unless ref($selected->{$role}) eq 'ARRAY';
            $files{$role}=[map {+{path=>$jobs->resolve_grant($_)}} @{$selected->{$role}}];
        }
        my $plan=Pheno::Ranker::Desktop::ReferenceCache::plan(
            Pheno::Ranker::Desktop::Service::root(), $body->{conversion} || '', \%files, $body->{options} || {});
        delete $plan->{prefix};
        return $plan;
    });
};
post '/api/jobs/preflight' => sub {
    my $c=shift;
    job_call($c,sub {
        my $body=$c->req->json;
        die "Provide a cohort request\n" unless ref($body) eq 'HASH' && ($body->{conversion} || '') eq 'cohort';
        my $selected=$body->{input}{files};
        die "Provide selected input files\n" unless ref($selected) eq 'HASH';
        my %files;
        for my $role (keys %$selected) {
            die "Selected files must be an array\n" unless ref($selected->{$role}) eq 'ARRAY';
            $files{$role}=[map {my $file=$jobs->resolve_grant($_); +{path=>$file,filename=>File::Basename::basename($file)}} @{$selected->{$role}}];
        }
        die "Options must be an object\n" unless ref($body->{options} || {}) eq 'HASH';
        return Pheno::Ranker::Desktop::Safety::assess('cohort',\%files,$body->{options} || {},undef,$jobs->settings->{limits});
    });
};
get '/api/jobs/:id' => sub { my $c=shift; job_call($c,sub {$jobs->status($c->param('id'))}) };
get '/api/jobs/:id/log' => sub { my $c=shift; job_call($c,sub {$jobs->log_preview($c->param('id'))}) };
post '/api/jobs/:id/alignment' => sub {
    my $c=shift;
    job_call($c,sub {$jobs->pair_alignment($c->param('id'), ($c->req->json || {})->{reference})});
};
post '/api/jobs/:id/rename' => sub { my $c=shift; job_call($c,sub {$jobs->rename_run($c->param('id'), ($c->req->json || {})->{name})}) };
post '/api/jobs/:id/cancel' => sub { my $c=shift; job_call($c,sub {$jobs->cancel($c->param('id'))}) };
del '/api/jobs/:id' => sub { my $c=shift; job_call($c,sub {$jobs->delete_history($c->param('id'))}) };
del '/api/jobs' => sub { my $c=shift; job_call($c,sub {$jobs->delete_all(0)}) };
post '/api/jobs/delete-all-files' => sub { my $c=shift; job_call($c,sub {$jobs->delete_all(1)}) };
del '/api/jobs/:id/files' => sub { my $c=shift; job_call($c,sub {$jobs->delete_files($c->param('id'))}) };
get '/api/jobs/:id/outputs/:artifact/preview' => sub {
    my $c=shift; job_call($c,sub {$jobs->preview($c->param('id'),$c->param('artifact'))});
};
get '/api/jobs/:id/outputs/:artifact/download' => sub {
    my $c=shift;
    my ($file,$entry)=eval {$jobs->artifact($c->param('id'),$c->param('artifact'))};
    return render_error($c,404,'output_unavailable','Output is unavailable') if $@;
    $c->res->headers->content_type($entry->{mediaType});
    $c->res->headers->content_disposition('attachment; filename="'.$entry->{filename}.'"');
    return $c->reply->file("$file");
};


post '/api/jobs/:id/outputs/:artifact/input' => sub {
    my $c=shift;
    job_call($c,sub {my ($file)=$jobs->artifact($c->param('id'),$c->param('artifact')); $jobs->register_file("$file")},201);
};
post '/api/examples/:mode' => sub {
    my $c=shift;
    job_call($c,sub {
        my $mode=$c->param('mode');
        my $paths=Pheno::Ranker::Desktop::Service::example_files($mode, ($c->req->json || {})->{operation});
        return {map {$_=>[$jobs->register_file($paths->{$_})]} keys %$paths};
    });
};
app->max_request_size($MAX_UPLOAD_BYTES + 1024 * 1024);
app->start unless caller;
app;
