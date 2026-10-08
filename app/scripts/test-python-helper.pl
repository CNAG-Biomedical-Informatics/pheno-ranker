#!/usr/bin/env perl
use strict;
use warnings;
use Cwd qw(abs_path getcwd);
use File::Spec;
use File::Temp qw(tempdir);
use FindBin qw($Bin);
use Getopt::Long qw(GetOptions);
use JSON::PP qw(encode_json decode_json);

my ($helper, $python);
GetOptions('helper=s' => \$helper, 'python=s' => \$python) or die "Invalid arguments\n";
die "Provide either --helper EXECUTABLE or --python INTERPRETER\n" unless !!$helper != !!$python;
my @command = $helper ? (abs_path($helper)) : (File::Spec->rel2abs($python), abs_path("$Bin/../engine/python/worker.py"));
die "Executable not found\n" if grep {!defined || !-f} @command;
my $temporary = tempdir('ranker-helper-XXXXXX', TMPDIR=>1, CLEANUP=>1);
my $original = getcwd();
END {chdir $original if defined $original}
chdir $temporary or die $!;
$ENV{MPLCONFIGDIR} = File::Spec->catdir($temporary, 'matplotlib');
$ENV{NUMBA_CACHE_DIR} = File::Spec->catdir($temporary, 'numba');
$ENV{OMP_NUM_THREADS} = 1;
$ENV{OPENBLAS_NUM_THREADS} = 1;

sub write_file {
    my ($file, $text) = @_;
    open my $fh, '>:raw', $file or die "$file: $!";
    print {$fh} $text;
    close $fh or die $!;
}
sub read_file {
    my ($file) = @_;
    open my $fh, '<:raw', $file or die "$file: $!";
    local $/; return <$fh>;
}
sub run {
    my (@args) = @_;
    print "Testing Python helper: $args[0]\n";
    system @command, @args;
    die "Python helper $args[0] failed (status $?)\n" if $?;
}
my $template = {'phenotypicFeatures.HP:0001250.type.id.HP:0001250'=>1,
                'phenotypicFeatures.HP:0001263.type.id.HP:0001263'=>1};
write_file('template.json', encode_json($template));
write_file('labels.json', encode_json({(sort keys %$template)[0]=>'Seizure',
                                     (sort keys %$template)[1]=>'Global developmental delay'}));
write_file('vectors.json', encode_json({sample=>{binary_digit_string=>'10'}}));
run('qr-encode', '-i', 'vectors.json', '-o', 'qr', '--template', 'template.json', '--labels', 'labels.json');
die "QR output missing\n" unless -s 'qr/sample.png';
run('qr-decode', '-i', 'qr/sample.png', '-t', 'template.json', '-o', 'decoded.json');
my $decoded = read_file('decoded.json');
my $expected = [{id_from_qr=>'sample',phenotypicFeatures=>[{type=>{id=>'HP:0001250'}}]}];
my $canonical = JSON::PP->new->canonical;
die "QR round-trip mismatch or unwanted label enrichment\n"
  unless $canonical->encode(decode_json($decoded)) eq $canonical->encode($expected);
run('pdf', '--json', 'decoded.json', '--qr', 'qr/sample.png', '--type', 'pxf',
    '--labels', 'qr/labels.json', '--template', 'qr/glob_hash.json', '--output', 'pdf');
die "Invalid PDF output\n" unless read_file('pdf/sample.pdf') =~ /\A%PDF-/;
die "PDF enrichment changed decoded JSON\n" unless read_file('decoded.json') eq $decoded;
for my $format (qw(bff pxf)) {
    my $key = $format eq 'bff' ? 'featureType' : 'type';
    write_file("$format.json", encode_json([{id=>'sample',
        ($format eq 'pxf' ? (subject=>{id=>'sample'}) : ()),
        phenotypicFeatures=>[{$key=>{id=>'HP:0001250',label=>'Seizure'}}]}]));
    run('summary', '-i', "$format.json", '-o', "$format.html");
    my $html = read_file("$format.html");
    die "Incomplete $format summary\n" unless $html =~ /<html/i && $html =~ /Seizure/;
}
write_file('matrix.txt', "ID\ta\tb\tc\td\na\t1\t.8\t.2\t.1\nb\t.8\t1\t.3\t.2\nc\t.2\t.3\t1\t.9\nd\t.1\t.2\t.9\t1\n");
for my $method (qw(mds umap)) {
    run($method, '--input', 'matrix.txt', '--metric', 'jaccard');
    my $result = decode_json(read_file("$method.json"));
    die "Invalid $method output\n" unless ($result->{method} // '') eq $method && !$result->{skipped}
      && join(',', map {$_->{id}} @{$result->{points} || []}) eq 'a,b,c,d';
    for my $point (@{$result->{points}}) {
        die "Missing $method coordinates\n" unless defined $point->{x} && defined $point->{y};
    }
}
print "Python helper end-to-end smoke tests passed\n";
