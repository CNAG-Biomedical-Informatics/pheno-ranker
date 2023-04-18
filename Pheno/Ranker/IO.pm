package Pheno::Ranker::IO;

use strict;
use warnings;
use autodie;
use feature qw(say);
use Path::Tiny;
use YAML::XS qw(LoadFile DumpFile);
use JSON::XS;

#use Sort::Naturally qw(nsort);

use Exporter 'import';
our @EXPORT = qw(serialize_hashes write_alignment read_json read_yaml write_json);
use constant DEVEL_MODE => 0;

#########################
#########################
#  SUBROUTINES FOR I/O  #
#########################
#########################

sub serialize_hashes {

    my $arg = shift;
    write_json( { data => $arg->{$_}, filepath => qq/$_.json/ } )
      for keys %{$arg};
    return 1;
}

sub write_alignment {

    my ( $output, $array ) = @_;

    # Watch out for RAM usage!!!
    open( my $fh, ">", $output );
    print $fh join "\n", @$array;
    close $fh;
}

sub read_json {

    my $file = shift;

# NB: hp.json is non-UTF8
# malformed UTF-8 character in JSON string, at character offset 680 (before "\x{fffd}r"\n      },...")
    my $str =
      $file =~ /hp\.json/ ? path($file)->slurp : path($file)->slurp_utf8;
    return decode_json($str);    # Decode to Perl data structure
}

sub read_yaml {

    return LoadFile(shift);      # Decode to Perl data structure
}

sub write_json {

    my $arg       = shift;
    my $file      = $arg->{filepath};
    my $json_data = $arg->{data};

    # Note that canonical DOES not match the order of nsort from Sort:.Naturally
    my $json = JSON::XS->new->utf8->canonical->pretty->encode($json_data);
    path($file)->spew_utf8($json);
    return 1;
}

1;
