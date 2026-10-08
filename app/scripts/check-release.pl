#!/usr/bin/env perl
use strict;
use warnings;
use FindBin qw($Bin);
use File::Spec;
use Getopt::Long qw(GetOptions);
use JSON::PP qw(decode_json);

my $root = File::Spec->catdir($Bin, '..', '..');
GetOptions('root=s' => \$root) or die "Usage: $0 [--root DIRECTORY] [TAG]\n";
sub read_file {
    my ($name) = @_;
    open my $fh, '<', File::Spec->catfile($root, split m{/}, $name) or die "Cannot read $name: $!\n";
    local $/;
    my $text = <$fh>;
    $text =~ s/\r\n/\n/g;
    return $text;
}
my $version = read_file('VERSION');
$version =~ s/\s+\z//;
die "Expected a stable VERSION such as 1.09\n" unless $version =~ /\A(\d+)\.(\d+)\z/;
# Perl 1.09 maps to SemVer 1.9.0 (leading zeroes are not valid in SemVer).
my $desktop = (0 + $1).'.'.(0 + $2).'.0';
my $tag = shift;
die "Release tag must equal VERSION ($version)\n" if defined($tag) && $tag ne $version;
die "Unexpected arguments\n" if @ARGV;
for my $file ('lib/Pheno/Ranker.pm', 'lib/Pheno/Ranker/Version.pm') {
    my ($core) = read_file($file) =~ /our\s+\$VERSION\s*=\s*'([^']+)'/;
    die "Version mismatch in $file\n" unless defined($core) && $core eq $version;
}
for my $file ('app/package.json', 'app/package-lock.json', 'app/src-tauri/tauri.conf.json') {
    my $data = decode_json(read_file($file));
    die "Version mismatch in $file\n" unless ($data->{version} // '') eq $desktop;
    die "Root package version mismatch in $file\n"
      if $data->{packages} && ($data->{packages}{''}{version} // '') ne $desktop;
}
my ($cargo) = read_file('app/src-tauri/Cargo.toml') =~ /^version = "([^"]+)"/m;
die "Cargo version mismatch\n" unless defined($cargo) && $cargo eq $desktop;
my ($lock) = read_file('app/src-tauri/Cargo.lock') =~ /name = "pheno-ranker-desktop"\s+version = "([^"]+)"/;
die "Cargo lock version mismatch\n" unless defined($lock) && $lock eq $desktop;
die "Changes does not contain the release version\n" unless read_file('Changes') =~ /^\Q$version\E /m;
print "Release versions agree: $version (Desktop $desktop)\n";
