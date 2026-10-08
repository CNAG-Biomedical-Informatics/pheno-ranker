use strict;
use warnings;
use lib qw(lib app/engine/lib);
use Test::More;
use File::Temp qw(tempdir);
use Path::Tiny qw(path);
use Cwd qw(abs_path);

my $script = abs_path('app/scripts/check-release.pl');
my $root = path(tempdir(CLEANUP => 1));
my @files = qw(VERSION Changes lib/Pheno/Ranker.pm lib/Pheno/Ranker/Version.pm
    app/package.json app/package-lock.json app/src-tauri/tauri.conf.json
    app/src-tauri/Cargo.toml app/src-tauri/Cargo.lock);
for my $name (@files) {
    $root->child($name)->parent->mkpath;
    path($name)->copy($root->child($name));
}
sub check {
    my (@args) = @_;
    open my $pipe, '-|', $^X, $script, '--root', "$root", @args or die $!;
    my $output = do { local $/; <$pipe> };
    close $pipe;
    return ($? >> 8, $output);
}
my $version = path('VERSION')->slurp_raw;
$version =~ s/\s+\z//;
my ($major, $minor) = split /\./, $version;
my $desktop = (0 + $major).'.'.(0 + $minor).'.0';
my ($status, $output) = check($version);
is($status, 0, 'matching versions accepted');
like($output, qr/\Q$version\E \(Desktop \Q$desktop\E\)/, 'Perl version maps to valid SemVer');
($status) = check('not-the-release');
isnt($status, 0, 'incorrect release tag rejected');
for my $name (@files) {
    my $file = $root->child($name);
    my $original = $file->slurp_raw;
    my $changed = $original;
    $changed =~ s/\Q$desktop\E/999.999.0/g;
    $changed =~ s/\Q$version\E/999.999/g;
    $file->spew_raw($changed);
    ($status) = check();
    isnt($status, 0, "version drift rejected in $name");
    $file->spew_raw($original);
}
done_testing;
