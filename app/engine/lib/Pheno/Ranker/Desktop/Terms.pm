package Pheno::Ranker::Desktop::Terms;
use strict;
use warnings;
use File::Spec::Functions qw(catfile);
use Pheno::Ranker::Config;
use Pheno::Ranker::IO qw(io_yaml_or_json);
use Pheno::Ranker::Desktop::Service qw(root);

sub choices {
    my ($jobs, $body) = @_;
    die "Term request must be an object\n" unless ref($body) eq 'HASH';
    my $sources = $body->{sources} || [];
    die "Term sources must be a list\n" unless ref($sources) eq 'ARRAY';
    my $config = $body->{config} ? $jobs->resolve_grant($body->{config})
      : catfile($ENV{PHENO_RANKER_SHARE_DIR} || catfile(root(), 'share'), 'conf', 'config.yaml');
    die "Configuration is too large to preview\n" if -s $config > 4 * 1024 * 1024;
    my $allowed = Pheno::Ranker::Config->new(file => $config)->allowed_terms;
    my (%present, $partial);
    for my $index (0 .. $#$sources) {
        if ($index >= 20) { $partial = 1; last }
        my $file = $jobs->resolve_grant($sources->[$index]);
        if (-d $file || $file =~ /\.gz$/i || -s $file > 4 * 1024 * 1024) { $partial = 1; next }
        my $data = eval { io_yaml_or_json({filepath => $file, mode => 'read'}) };
        if ($@ || !ref($data)) { $partial = 1; next }
        my @records = ref($data) eq 'ARRAY' ? @$data : ($data);
        for my $record (@records) {
            next unless ref($record) eq 'HASH';
            $present{$_} = 1 for keys %$record;
        }
    }
    return {allowed => $allowed, present => [sort grep {$present{$_}} @$allowed],
      note => $partial ? 'Some inputs could not be inspected within the preview limit. All configured terms remain available.' : ''};
}
1;
