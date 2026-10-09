#!/usr/bin/env perl

use strict;
use warnings;
use Config;
use Cwd qw(abs_path);
use File::Basename qw(dirname);
use File::Copy qw(copy);
use File::Find qw(find);
use File::Path qw(make_path remove_tree);
use File::Spec;
use Getopt::Long qw(GetOptions);
use JSON::PP;

my ( $root, $destination, $perl_prefix, $compiler_bin, $python_helper,
    @extra_perl_libs );
GetOptions(
    'root=s'            => \$root,
    'destination=s'     => \$destination,
    'perl-prefix=s'     => \$perl_prefix,
    'compiler-bin=s'    => \$compiler_bin,
    'extra-perl-lib=s@' => \@extra_perl_libs,
    'python-helper=s'   => \$python_helper,
) or die "Invalid arguments\n";

$root = abs_path( $root // '.' ) or die "Cannot resolve repository root\n";
$perl_prefix = abs_path( $perl_prefix // die "Provide --perl-prefix\n" )
  or die "Cannot resolve Perl prefix\n";
$python_helper = abs_path( $python_helper // die "Provide --python-helper\n" )
  or die "Cannot resolve Python helper\n";
$destination = File::Spec->rel2abs(
    $destination // File::Spec->catdir( $root, 'app', 'src-tauri', 'engine' ) );
my $expected = File::Spec->catdir( $root, 'app', 'src-tauri', 'engine' );
die "Destination must be app/src-tauri/engine\n"
  unless File::Spec->canonpath($destination) eq File::Spec->canonpath($expected);
die "Refusing to package a system Perl prefix\n"
  if grep { $perl_prefix eq $_ } ( File::Spec->rootdir, '/usr', '/usr/local' );

remove_tree($destination) if -e $destination;
make_path($destination);

sub copy_tree {
    my ( $source, $target, $include ) = @_;
    die "Missing package source <$source>\n" unless -e $source;
    my $source_abs = abs_path($source) || $source;
    find(
        {
            no_chdir => 1,
            wanted   => sub {
                my $source_file = $File::Find::name;
                my $relative = File::Spec->abs2rel( $source_file, $source_abs );
                return if $relative eq '.';
                my $directory = -d $source_file && !-l $source_file;
                unless ( $include->( $relative, $directory ) ) {
                    $File::Find::prune = 1 if $directory;
                    return;
                }
                my $output = File::Spec->catfile( $target, $relative );
                if ($directory) {
                    make_path($output);
                    return;
                }
                make_path( dirname($output) );
                if ( -l $source_file ) {
                    my $link = readlink($source_file);
                    die "Absolute link in runtime: $source_file\n"
                      if File::Spec->file_name_is_absolute($link);
                    symlink $link, $output
                      or die "Cannot copy link <$source_file>: $!\n";
                    return;
                }
                copy( $source_file, $output )
                  or die "Cannot copy <$source_file>: $!\n";
                chmod( ( stat($source_file) )[2] & 07777, $output )
                  unless $^O eq 'MSWin32';
            },
        },
        $source_abs,
    );
}

my $all = sub {1};
my $runtime_perl = $^O eq 'MSWin32'
  ? File::Spec->catdir( $destination, 'runtime', 'perl' )
  : File::Spec->catdir( $destination, 'runtime' );
for my $directory (qw(bin lib)) {
    copy_tree(
        File::Spec->catdir( $perl_prefix, $directory ),
        File::Spec->catdir( $runtime_perl, $directory ), $all
    );
}
if ( $^O eq 'MSWin32' ) {
    my $portable = File::Spec->catfile( dirname($perl_prefix), 'portable.perl' );
    die "Strawberry portable marker is missing <$portable>\n" unless -f $portable;
    copy( $portable, File::Spec->catfile( $destination, 'runtime', 'portable.perl' ) )
      or die "Cannot copy Strawberry portable marker: $!\n";
}
for my $library (@extra_perl_libs) {
    die "Missing additional Perl library <$library>\n" unless -d $library;
    my $arch_library = File::Spec->catdir( $library, $Config{archname} );
    copy_tree(
        $library, File::Spec->catdir( $runtime_perl, 'lib' ),
        sub {
            my ($relative) = @_;
            my @parts = File::Spec->splitdir($relative);
            return 0 if @parts && $parts[0] eq '.meta';
            return 0 if -d $arch_library && @parts && $parts[0] eq $Config{archname};
            return 1;
        }
    );
    copy_tree(
        $arch_library, File::Spec->catdir( $runtime_perl, 'lib' ),
        sub { my @parts = File::Spec->splitdir( $_[0] ); return !( @parts && $parts[0] eq '.meta' ) }
    ) if -d $arch_library;
}
if ( defined $compiler_bin && -d $compiler_bin ) {
    for my $dll ( glob File::Spec->catfile( $compiler_bin, '*.dll' ) ) {
        copy( $dll, File::Spec->catdir( $runtime_perl, 'bin' ) )
          or die "Cannot copy <$dll>: $!\n";
    }
}

copy_tree( File::Spec->catdir( $root, 'lib' ),
    File::Spec->catdir( $destination, 'lib' ), $all );
copy_tree( File::Spec->catdir( $root, 'share' ),
    File::Spec->catdir( $destination, 'share' ), $all );
copy_tree( File::Spec->catdir( $root, 'app', 'data' ),
    File::Spec->catdir( $destination, 'app', 'data' ), $all );
copy_tree( File::Spec->catdir( $root, 'app', 'engine' ),
    File::Spec->catdir( $destination, 'app', 'engine' ),
    sub { $_[0] !~ m{(?:^|[\\/])(?:t|__pycache__)(?:[\\/]|$)} }
);
copy_tree( File::Spec->catdir( $root, 'utils' ),
    File::Spec->catdir( $destination, 'utils' ),
    sub { $_[0] !~ m{(?:^|[\\/])(?:tests?|bck|vcf|__pycache__)(?:[\\/]|$)} }
);
make_path( File::Spec->catdir( $destination, 'bin' ) );
copy( File::Spec->catfile( $root, 'bin', 'pheno-ranker' ),
    File::Spec->catfile( $destination, 'bin', 'pheno-ranker' ) )
  or die "Cannot copy pheno-ranker: $!\n";
copy( File::Spec->catfile( $root, 'LICENSE' ),
    File::Spec->catfile( $destination, 'LICENSE' ) )
  or die "Cannot copy license: $!\n";

# Only synthetic inputs needed by the in-app examples are packaged.
make_path( File::Spec->catdir( $destination, 't', 'data' ) );
for my $fixture (qw(individuals.json patient.json example.csv)) {
    copy( File::Spec->catfile( $root, 't', 'data', $fixture ),
        File::Spec->catfile( $destination, 't', 'data', $fixture ) )
      or die "Cannot copy example <$fixture>: $!\n";
}

my $perl = File::Spec->catfile( $runtime_perl, 'bin',
    $^O eq 'MSWin32' ? 'perl.exe' : 'perl' );
die "Staged Perl executable is missing\n"
  unless -x $perl || ( $^O eq 'MSWin32' && -f $perl );

# Inline::C validates Perl version, architecture and the source digest before
# loading. Warm the exact packaged interpreter and discard compiler scratch.
my $inline = File::Spec->catdir( $destination, 'inline' );
local $ENV{PHENO_RANKER_INLINE_DIR} = $inline;
local $ENV{PHENO_RANKER_ROOT} = $destination;
local $ENV{PHENO_RANKER_SHARE_DIR} = File::Spec->catdir( $destination, 'share' );
local $ENV{PERL5LIB} = join( $Config{path_sep},
    File::Spec->catdir( $destination, 'lib' ),
    File::Spec->catdir( $runtime_perl, 'lib' ) );
system $perl, '-MPheno::Ranker::Metrics', '-e',
  'die "Metric cache probe failed\n" unless Pheno::Ranker::Metrics::hd_fast("01","11") == 1';
die "Could not build the packaged metric cache\n" if $? != 0;
remove_tree( File::Spec->catdir( $inline, 'build' ) );

make_path( File::Spec->catdir( $destination, 'python' ) );
my $helper_name = $^O eq 'MSWin32' ? 'pheno-ranker-helper.exe' : 'pheno-ranker-helper';
my $staged_helper = File::Spec->catfile( $destination, 'python', $helper_name );
copy( $python_helper, $staged_helper )
  or die "Cannot copy Python helper: $!\n";
unless ( $^O eq 'MSWin32' ) {
    chmod( ( stat($python_helper) )[2] & 07777, $staged_helper )
      or die "Cannot preserve Python helper permissions: $!\n";
    die "Staged Python helper is not executable\n" unless -x $staged_helper;
}

my $manifest = {
    format => 'pheno-ranker-desktop-engine', formatVersion => 1,
    perlVersion => 0 + $], platform => $^O,
    utilities => [qw(csv simulate summary qr-encode qr-decode pdf)],
    pythonHelper => JSON::PP::true,
};
open my $fh, '>:raw', File::Spec->catfile( $destination, 'engine-manifest.json' )
  or die "Cannot write engine manifest: $!\n";
print {$fh} JSON::PP->new->canonical->pretty->encode($manifest);
close $fh or die "Cannot close engine manifest: $!\n";
print "$destination\n";
