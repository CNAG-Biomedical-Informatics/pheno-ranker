package Pheno::Ranker::Desktop::Service;
use strict;
use warnings;
use Exporter 'import';
use Cwd qw(abs_path getcwd);
use File::Basename qw(dirname);
use File::Spec::Functions qw(catdir catfile);
use File::Find qw(find);
use JSON::XS;
use Path::Tiny qw(path);
use Scalar::Util qw(blessed);
use Pheno::Ranker::Version;
use Pheno::Ranker::Desktop::Safety qw(assess);
use Pheno::Ranker::Desktop::ReferenceCache;
use Digest::SHA;
use Pheno::Ranker::Desktop::Limits qw(limits);

our @EXPORT_OK = qw(catalog health execute execute_files root example_files);
my $JSON = JSON::XS->new->utf8->canonical->pretty;
my $MODULE_FILE = abs_path(__FILE__);
sub root {
    return $ENV{PHENO_RANKER_ROOT} if $ENV{PHENO_RANKER_ROOT};
    my $root = dirname($MODULE_FILE);
    $root = dirname($root) for 1 .. 6;
    return $root;
}
sub health { +{ok => JSON::XS::true, data => {version => $Pheno::Ranker::Version::VERSION, engine => 'perl'}} }
sub example_files {
    my ($mode, $operation) = @_;
    if ($mode eq 'omim' || $mode eq 'orpha') {
        $operation //= 'patient';
        die "Unknown example operation\n" unless $operation eq 'patient' || $operation eq 'cohort';
        my $files = {reference => catfile(root(),'share','diseases','hpo',"$mode.pxf.json.gz")};
        $files->{target} = catfile(root(),'app','engine','examples','patient.json') if $operation eq 'patient';
        return $files;
    }
    die "Unknown example\n" unless $mode eq 'patient' || $mode eq 'cohort' || $mode eq 'csv';
    my %paths = $mode eq 'csv' ? (source => 'example.csv') : (reference => 'individuals.json');
    $paths{target} = 'patient.json' if $mode eq 'patient';
    return {map {$_ => catfile(root(),'t','data',$paths{$_})} keys %paths};
}
sub option { my ($name, $label, $kind, %more) = @_; +{name=>$name,label=>$label,kind=>$kind,%more} }
sub file_role { my ($name,$label,$required,$multiple,$accept)=@_; +{name=>$name,label=>$label,required=>$required ? JSON::XS::true : JSON::XS::false,multiple=>$multiple ? JSON::XS::true : JSON::XS::false,accept=>$accept || ['.json','.yaml','.yml','.gz']} }
sub projection_options {
    return (
        option('projection','Projection','select',values=>[qw(mds umap none)],default=>'mds'),
        option('n-neighbors','UMAP neighbours','integer',minimum=>2,maximum=>200,default=>30,visibleWhen=>{projection=>['umap']}),
        option('min-dist','UMAP minimum distance','number',minimum=>0,maximum=>1,default=>0.3,visibleWhen=>{projection=>['umap']}),
        option('seed','UMAP random seed','integer',minimum=>0,maximum=>2147483647,default=>42,visibleWhen=>{projection=>['umap']}),
    );
}
sub catalog {
    my @common = (
        option('include-terms','Include terms','multiselect'),
        option('exclude-terms','Exclude terms','multiselect'),
        option('append-prefixes','Cohort prefixes (one per reference)','multiselect'),
        option('include-hpo-ascendants','Include HPO ancestors','boolean'),
        option('retain-excluded-phenotypicFeatures','Retain excluded phenotypic features','boolean'),
        option('age','Compare age-based terms','boolean'),
        option('max-number-vars','Maximum variables','integer',minimum=>1),
        option('export','Retain intermediate files for QR codes and reuse (uses extra disk space)','boolean',default=>JSON::XS::true),
        option('patients-of-interest','Record IDs to extract','multiselect'),
    );
    my @input = (
        file_role('reference','Reference cohorts',0,1),
        file_role('precomputed','Precomputed reference files',0,1,['.json']),
        file_role('config','Configuration',0,0),
        file_role('weights','Weights',0,0),
    );
    my @ops = (
        {id=>'patient',label=>'Patient ranking',description=>'Rank reference records against one target.',files=>[@input,file_role('target','Target record',1,0)],options=>[
            @common,option('max-out','Maximum ranked records','integer',minimum=>1,default=>10),
            option('sort-by','Rank by','select',values=>[qw(jaccard hamming)]),option('align','Generate alignment','boolean',default=>JSON::XS::true)]},
        {id=>'cohort',label=>'Cohort comparison',description=>'Compare all records within or across cohorts.',files=>\@input,options=>[
            @common,option('similarity-metric-cohort','Metric','select',values=>[qw(hamming jaccard)],default=>'hamming'),
            option('matrix-format','Matrix format','select',values=>[qw(dense mtx)],default=>'dense'),
            option('max-matrix-records-in-ram','Matrix records held in RAM','integer',minimum=>0),
            option('cytoscape-json','Export graph','boolean',default=>JSON::XS::true),option('graph-stats','Graph statistics','boolean'),
            option('allow-large-graph','Allow large graph export (risk of exhausting RAM)','boolean'),
            option('graph-min-weight','Minimum edge weight','number'),option('graph-max-weight','Maximum edge weight','number'),
            projection_options(),option('mds','Legacy MDS setting','boolean')]},
        {id=>'projection',label=>'Projection',description=>'Create another projection from a completed cohort matrix.',files=>[file_role('matrix','Source matrix',1,0,['.txt'])],options=>[
            projection_options(),option('metric','Source metric','select',values=>[qw(hamming jaccard)]),option('source-run','Source run','string')]},
        {id=>'csv',label=>'CSV / TSV preparation',description=>'Convert categorical tables and generate ranking configuration.',files=>[file_role('source','CSV or TSV',1,0,['.csv','.tsv'])],options=>[
            option('primary-key-name','Identifier column','string'),option('generate-primary-key','Generate identifiers','boolean'),option('separator','Column separator','string'),option('array-separator','Array separator (regular expression)','string')]},
        {id=>'simulate',label=>'Simulate records',description=>'Create reproducible synthetic BFF or PXF cohorts.',files=>[file_role('ontologies','Custom ontologies',0,0)],options=>[
            option('format','Format','select',values=>[qw(bff pxf)],default=>'bff'),option('number','Number of records','integer',minimum=>1,default=>100),option('random-seed','Random seed','integer',default=>42),
            map {option($_,$_, 'integer',minimum=>0,default=>1)} qw(phenotypicFeatures diseases treatments procedures exposures)]},
        {id=>'summary',label=>'Phenotype summary plot',description=>'Plot the contents of BFF or PXF records.',files=>[file_role('source','BFF or PXF records',1,0)],options=>[
            option('output-format','Output format','select',values=>['html'],default=>'html')]},
        {id=>'qr-encode',label=>'Encode QR codes',description=>'Encode reference profiles. A matching global hash also prepares records for PDF reports.',files=>[file_role('source','Exported reference binary hash',1,0),file_role('template','Matching global hash (optional, enables PDF reports)',0,0),file_role('labels','Matching label sidecar (optional, for PDF hints)',0,0)],options=>[
            option('no-compress','Disable compression','boolean'),option('qr-version','Minimum QR version','integer',minimum=>1,maximum=>40,default=>1)]},
        {id=>'qr-decode',label=>'Decode QR codes',description=>'Decode QR profiles using their matching global hash.',files=>[file_role('source','QR images',1,1,['.png']),file_role('template','Global hash / template',1,0)],options=>[option('generate-csv','Also generate CSV','boolean')]},
        {id=>'pdf',label=>'PDF reports',description=>'Create reports from decoded QR records and their matching QR images.',files=>[file_role('source','JSON from QR decoding',1,0,['.json']),file_role('qr','Matching QR images',1,1,['.png']),file_role('template','Matching global hash (required with labels)',0,0),file_role('labels','Matching label sidecar (optional PDF hints)',0,0),file_role('logo','Optional logo',0,0,['.png','.jpg'])],options=>[
            option('type','Format','select',values=>[qw(bff pxf)],default=>'bff'),
            option('label-hints','Include label hints in PDF','boolean',default=>JSON::XS::true,description=>'Uses the matching template and labels when supplied. Source JSON is unchanged.')]},
    );
    for my $op (@ops) {
        $op->{available}=JSON::XS::true;
        $op->{input}={files=>delete $op->{files}};
    }
    return {ok=>JSON::XS::true,data=>\@ops};
}

sub execute {
    my ($operation,$request,$delivery)=@_;
    my $file=catfile($delivery->{workspace},'input.json');
    path($file)->spew_raw($JSON->encode($request->{input}{data}));
    return execute_files($operation,$request,{reference=>[{path=>$file,filename=>'input.json'}]},$delivery);
}
sub _precomputed_prefix {
    my ($entries)=@_;
    return unless @$entries;
    die "Select all four precomputed reference files\n" unless @$entries == 4;
    my (%kinds,$prefix);
    for my $entry (@$entries) {
        my ($candidate,$kind)=$entry->{path}=~m{\A(.*)\.(glob_hash|ref_hash|ref_binary_hash|coverage_stats)\.json\z};
        die "Invalid precomputed reference filename\n" unless defined $candidate;
        die "Precomputed reference files must share one path prefix\n"
          if defined($prefix) && $prefix ne $candidate;
        die "Duplicate precomputed reference file\n" if $kinds{$kind}++;
        $prefix=$candidate;
    }
    die "Select all four precomputed reference file types\n"
      unless keys(%kinds) == 4;
    return $prefix;
}
sub _validate {
    my ($operation,$request,$files)=@_;
    my ($spec)=grep {$_->{id} eq $operation} @{catalog()->{data}};
    die "Unknown operation\n" unless $spec;
    die "Options must be an object\n" unless ref($request->{options} || {}) eq 'HASH';
    my %roles=map {$_->{name}=>$_} @{$spec->{input}{files}};
    die "Unknown input role\n" if grep {!$roles{$_}} keys %$files;
    for my $name (keys %roles) {
        my $entries=$files->{$name} || [];
        die "Missing $roles{$name}{label}\n" if $roles{$name}{required} && !@$entries;
        die "Select one $roles{$name}{label}\n" if !$roles{$name}{multiple} && @$entries>1;
        die "Input is not a readable file\n" if grep {!-f $_->{path} || !-r $_->{path}} @$entries;
    }
    if ($operation =~ /^(patient|cohort)$/) {
        my $references=$files->{reference} || [];
        my $precomputed=$files->{precomputed} || [];
        die "Select raw reference cohorts or precomputed reference files, not both\n"
          if @$references && @$precomputed;
        die "Select at least one reference cohort or a precomputed reference set\n"
          unless @$references || @$precomputed;
        _precomputed_prefix($precomputed) if @$precomputed;
        die "Weights cannot be used with precomputed references\n"
          if @$precomputed && @{$files->{weights} || []};
    }
    my %defs=map {$_->{name}=>$_} @{$spec->{options}};
    my %options=%{$request->{options} || {}};
    for my $name (keys %options) {
        my $d=$defs{$name} or die "Unknown option <$name>\n";
        my $v=$options{$name};
        if ($d->{kind} eq 'multiselect') {
            die "$name must be a list of values\n" unless ref($v) eq 'ARRAY' && !grep {ref($_) || !defined($_) || /\0/ || /^-/} @$v;
            next;
        }
        die "Invalid value for $name\n" if !defined($v) || (ref($v) && !JSON::XS::is_bool($v)) || "$v" =~ /\0/;
        die "$name must be an integer\n" if $d->{kind} eq 'integer' && "$v" !~ /\A-?\d+\z/;
        die "$name must be a number\n" if $d->{kind} eq 'number' && "$v" !~ /\A-?(?:\d+(?:\.\d*)?|\.\d+)\z/;
        die "$name must be true or false\n" if $d->{kind} eq 'boolean' && "$v" !~ /\A[01]\z/;
        $options{$name} = $v ? JSON::XS::true : JSON::XS::false if $d->{kind} eq 'boolean';
        die "$name is below its minimum\n" if defined($d->{minimum}) && $v<$d->{minimum};
        die "$name is above its maximum\n" if defined($d->{maximum}) && $v>$d->{maximum};
        die "Unsupported value for $name\n" if $d->{values} && !grep {$_ eq "$v"} @{$d->{values}};
    }
    return \%options;
}
sub _arguments {
    my ($options)=@_;
    my @args;
    for my $name (sort keys %$options) {
        my $value=$options->{$name};
        next if $name =~ /\A(?:mds|allow-large-graph|projection|n-neighbors|min-dist|seed|source-run|metric|label-hints)\z/;
        if (ref($value) eq 'ARRAY') {push @args,"--$name",@$value if @$value}
        elsif (JSON::XS::is_bool($value)) {push @args,"--$name" if $value}
        else {push @args,"--$name=$value"}
    }
    return @args;
}
sub _run_command {
    my ($dir,@command)=@_;
    open my $out,'>>:raw',catfile($dir,'stdout.log') or die "Cannot create job log: $!";
    open my $err,'>>:raw',catfile($dir,'stderr.log') or die "Cannot create job log: $!";
    # Reopen the actual standard descriptors: localizing the globs can leave
    # subprocess descriptors 1/2 pointing at the worker's null device.
    open my $saved_out,'>&',\*STDOUT or die $!;
    open my $saved_err,'>&',\*STDERR or die $!;
    open STDOUT,'>&',$out or die $!; open STDERR,'>&',$err or die $!;
    system {$command[0]} @command;
    my $status=$?;
    my $launch_error="$!";
    open STDOUT,'>&',$saved_out or die "Cannot restore stdout: $!";
    open STDERR,'>&',$saved_err or die "Cannot restore stderr: $!";
    if ($status) {
        my $details='';
        for my $name ('stderr.log','stdout.log') {
            open my $log,'<:raw',catfile($dir,$name) or next;
            my $size=-s $log;
            seek($log,$size>4000 ? $size-4000 : 0,0);
            local $/; $details=<$log> || '';
            last if $details =~ /\S/;
        }
        my $reason=$status == -1 ? "could not start: $launch_error"
          : $status & 127 ? 'signal '.($status & 127) : 'exit code '.($status >> 8);
        die "Operation failed ($reason): ".($details || 'No diagnostic output was produced.')."\n";
    }
}
sub _python {
    my $binary=$ENV{PHENO_RANKER_PYTHON_HELPER};
    return ($binary) if $binary;
    return ($ENV{PHENO_RANKER_PYTHON} || 'python3',catfile(root(),'app','engine','python','worker.py'));
}
sub _projection_command {
    my ($method,$matrix,$metric,$options,$limits)=@_;
    return [_python(),$method,'--input',$matrix,'--metric',$metric,'--max-records',$limits->{$method eq 'umap' ? 'umapRecords' : 'mdsRecords'},
        ($method eq 'umap' ? ('--n-neighbors',$options->{'n-neighbors'} // 30,
            '--min-dist',$options->{'min-dist'} // 0.3,'--seed',$options->{seed} // 42) : ())];
}
sub execute_files {
    my ($operation,$request,$files,$delivery)=@_;
    my $options=_validate($operation,$request,$files);
    my $limits=limits($delivery->{limits});
    my $reference_plan=Pheno::Ranker::Desktop::ReferenceCache::plan(root(),$operation,$files,$options);
    my $dir=$delivery->{directory};
    my $cwd=getcwd();
    my @commands;
    my $safety=assess($operation,$files,$options,undef,$limits);
    my @warnings=@{$safety->{warnings}};
    my $progress=$delivery->{progress} || sub {};
    my $one=sub { $files->{$_[0]}[0]{path} };
    my $many=sub { map {$_->{path}} @{$files->{$_[0]} || []} };
    my $ok=eval {
        chdir $dir or die "Cannot enter job workspace: $!";
        my %command_options=%$options;
        if ($safety->{skipGraph}) {
            delete @command_options{qw(cytoscape-json graph-stats)};
        }
        my $summary_format=delete $command_options{'output-format'};
        my @args=_arguments(\%command_options);
        if ($operation =~ /^(patient|cohort)$/) {
            # Keep collection membership out of the comparison data, but publish
            # a checksum-bound copy alongside results for reproducible colouring.
            if (@{$files->{reference} || []} == 1 && !@{$files->{config} || []}) {
                my $source=$one->('reference');
                my $sidecar=path("$source.provenance.json");
                if (-f $sidecar && !-l $sidecar && -s $sidecar<=8*1024*1024) {
                    my $metadata=eval {$JSON->decode($sidecar->slurp_raw)};
                    if (ref($metadata) eq 'HASH' && ($metadata->{format} || '') eq 'pheno-ranker-phenopacket-store'
                        && ref($metadata->{membership}) eq 'HASH') {
                        my $sha=Digest::SHA->new(256)->addfile($source)->hexdigest;
                        die "Phenopacket Store input no longer matches its provenance\n" unless $sha eq ($metadata->{sha256} || '');
                        path('collection-labels.json')->spew_raw($JSON->encode($metadata));
                    }
                }
            }
            $progress->('Comparing records'.($command_options{'cytoscape-json'} ? ' and exporting graph' : ''));
            my @cli=('--no-color');
            if (($reference_plan->{mode} || '') eq 'cached') {
                $progress->("Using precomputed $reference_plan->{dataset} reference");
                push @cli,'--precomputed-ref-prefix',$reference_plan->{prefix};
            } elsif (@{$files->{precomputed} || []}) {
                push @cli,'--precomputed-ref-prefix',_precomputed_prefix($files->{precomputed});
            } else {
                $progress->("Rebuilding $reference_plan->{dataset} reference: $reference_plan->{reason}") if $reference_plan->{dataset};
                push @cli,'--reference',$many->('reference');
            }
            push @cli,'--target',$one->('target') if $operation eq 'patient';
            push @cli,'--config',$one->('config') if $files->{config} && @{$files->{config}};
            push @cli,'--weights',$one->('weights') if $files->{weights} && @{$files->{weights}};
            push @cli,@args,'--out-file',($operation eq 'patient' ? 'rank.txt' : ($options->{'matrix-format'} || '') eq 'mtx' ? 'matrix.mtx' : 'matrix.txt');
            push @commands,[$^X,catfile(root(),'bin','pheno-ranker'),@cli];
            _run_command($dir,@{$commands[-1]});
            my $method = $options->{projection} // (exists($options->{mds}) ? ($options->{mds} ? 'mds' : 'none') : 'mds');
            if ($operation eq 'cohort' && $method ne 'none') {
                if (-f 'matrix.txt') {
                    $progress->('Preparing '.uc($method).' projection');
                    push @commands,_projection_command($method,'matrix.txt',$options->{'similarity-metric-cohort'} || 'hamming',$options,$limits);
                    eval {_run_command($dir,@{$commands[-1]}); 1} or push @warnings,"Projection failed; comparison outputs are complete: $@";
                } else { push @{$safety->{notes}},'Projection omitted: a dense matrix is required; Matrix Market output remains complete.' }
            }
        } elsif ($operation eq 'projection') {
            my $method=$options->{projection} || 'mds';
            die "Choose MDS or UMAP\n" if $method eq 'none';
            $progress->('Preparing '.uc($method).' projection from saved matrix');
            push @commands,_projection_command($method,$one->('matrix'),$options->{metric},$options,$limits);
            _run_command($dir,@{$commands[-1]});
        } elsif ($operation eq 'csv') {
            $progress->('Preparing CSV records');
            push @commands,[$^X,catfile(root(),'utils','csv2pheno_ranker','csv2pheno-ranker'),'--input',$one->('source'),'--output-dir',$dir,@args];
            _run_command($dir,@{$commands[-1]});
        } elsif ($operation eq 'simulate') {
            $progress->('Simulating records');
            push @args,'--external-ontologies',$one->('ontologies') if @{$files->{ontologies} || []};
            push @commands,[$^X,catfile(root(),'utils','bff_pxf_simulator','bff-pxf-simulator'),'--output','simulated.json',@args];
            _run_command($dir,@{$commands[-1]});
        } else {
            $progress->('Running companion utility');
            my @py=(_python(),$operation);
            if ($operation eq 'qr-decode') {push @py,'--input',$many->('source'),'--template',$one->('template'),'--output','decoded.json'}
            elsif ($operation eq 'pdf') {
                push @py,'--json',$one->('source'),'--qr',$many->('qr'),'--output','reports';
                push @py,'--logo',$one->('logo') if @{$files->{logo} || []};
                push @py,'--template',$one->('template') if ($options->{'label-hints'} // 1) && @{$files->{template} || []};
            } else {push @py,'--input',$one->('source'),'--output',($operation eq 'summary' ? 'summary.html' : 'qr')}
            push @py,'--template',$one->('template')
              if $operation eq 'qr-encode' && @{$files->{template} || []};
            push @py,'--labels',$one->('labels')
              if ($operation eq 'qr-encode' || ($operation eq 'pdf' && ($options->{'label-hints'} // 1))) && @{$files->{labels} || []};
            push @commands,[@py,@args];
            _run_command($dir,@{$commands[-1]});
        }
        1;
    };
    my $error=$@; chdir $cwd or die "Cannot restore workspace: $!"; die $error unless $ok;
    $progress->('Publishing outputs');
    path(catfile($dir,'run.json'))->spew_raw($JSON->encode({operation=>$operation,commands=>\@commands,options=>$options,limits=>$limits,warnings=>\@warnings,notes=>$safety->{notes},engineVersion=>$Pheno::Ranker::Version::VERSION}));
    my @artifacts;
    find({no_chdir=>1,wanted=>sub {
        return unless -f $File::Find::name && !-l $File::Find::name;
        my $relative=File::Spec->abs2rel($File::Find::name,$dir);
        my ($ext)=$relative =~ /\.([^.]+)$/; $ext=lc($ext || 'txt');
        my %media=(json=>'application/json',png=>'image/png',html=>'text/html',pdf=>'application/pdf',csv=>'text/csv',tsv=>'text/tab-separated-values');
        push @artifacts,{filename=>$relative,kind=>$ext,mediaType=>$media{$ext} || 'text/plain',bytes=>-s $File::Find::name};
    }},$dir);
    @artifacts=sort {$a->{filename} cmp $b->{filename}} @artifacts;
    $artifacts[$_]{id}='artifact-'.$_ for 0 .. $#artifacts;
    return {artifacts=>\@artifacts,warnings=>\@warnings,notes=>$safety->{notes},meta=>{operation=>$operation}};
}
1;
