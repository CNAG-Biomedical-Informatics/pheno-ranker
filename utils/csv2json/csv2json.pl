#!/usr/bin/env perl
#
#   An utility from Pheno-Ranker to convert a CSV to:
#
#   1 - Input file (JSON array of objects)
#   2 - Configuration file (needed for Pheno-Ranker)
#
#   Last Modified: Jul/29/2023
#
#   Version 0.00
#
#   Copyright (C) 2023 Manuel Rueda - CNAG (manuel.rueda@cnag.crg.eu)
#
#   License: Artistic License 2.0
#
#   If this program helps you in your research, please cite.

use strict;
use warnings;
use autodie;
use feature qw(say);
use Data::Dumper;
use Path::Tiny;
use File::Basename;
use List::Util 'uniq';
use YAML::XS qw(LoadFile DumpFile);
use JSON::XS;
use Text::CSV_XS;

# Usage
if ( $#ARGV != 0 ) {
    print "Usage:\n  ./$0 <csv>\n";
    exit;
}

# Create a Text::CSV object with semicolon as the separator
my $csv = Text::CSV_XS->new( { binary => 1, sep_char => ';', auto_diag => 1 } );

# Read the input file
my $input_file = $ARGV[0];
my ( $data, $arrays, $non_arrays ) = read_csv($input_file);

# Write data as JSON
my ( $name, $path, $suffix ) = fileparse( $input_file, qr/\.[^.]*/ );
write_json( { filepath => qq/$path$name.json/, data => $data } );

# Load the configuration file data
my $config = create_config( $arrays, $non_arrays );

# Write the configuration file as YAML
write_yaml( { filepath => qq/$path${name}_config.yaml/, data => $config } );

sub read_csv {

    my $file = shift;

    # Open filehandle
    open my $fh, '<', $file;

    # Parse the CSV data
    my $headers = $csv->getline($fh);

    my ( @rows, @arrays, @non_arrays );
    while ( my $row = $csv->getline($fh) ) {
        my %data;
        @data{@$headers} = @$row;

        # Check each field for comma-separated values
        for my $key ( keys %data ) {
            if ( $data{$key} =~ /,/ ) {

                # Split comma-separated values into an array
                $data{$key} = [ split /,/, $data{$key} ];
                push @arrays, $key;
            }
            else {
                push @non_arrays, $key;
            }
        }
        push @rows, \%data;
    }
    close $fh;
    return ( \@rows, [ uniq @arrays ], [ uniq @non_arrays ] );
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

sub write_yaml {

    my $arg       = shift;
    my $file      = $arg->{filepath};
    my $json_data = $arg->{data};
    local $YAML::XS::Boolean = 'JSON::PP';
    DumpFile( $file, $json_data );
    return 1;
}

sub create_config {

    my ( $arrays, $non_arrays ) = @_;

    # Set primary key.
    my $primary_key =
      ( grep { lc($_) eq 'id' } @$non_arrays ) ? 'id' : $non_arrays->[0];

    # Default for non-arrays
    my $config = {
        format        => 'CSV',
        primary_key   => $primary_key,
        allowed_terms => ['foo']
    };

    # Update for arrays
    if ( scalar @$arrays ) {

        # NB: Can't use $array more than once in the hash ref below. Need to deref
        $config->{array_terms}   = [@$arrays];
        $config->{allowed_terms} = [@$arrays];
        $config->{id_correspondence} =
          { CSV => [ map { $_ = { $_ => $_ } } @$arrays ] };

    }
    return $config;
}

=head1 NAME

csv2json.pl: A script that convert a CSV to an input suitable for Pheno-Ranker

=head1 SYNOPSIS

csv2json.pl <input.csv>

=head1 DESCRIPTION

A script that convert a CSV to an input suitable for Pheno-Ranker

=head1 SUMMARY

A script that convert a CSV to an input suitable for Pheno-Ranker

=head1 INSTALLATION

 $ cpanm --sudo --installdeps .

=head3 System requirements

  * Ideally a Debian-based distribution (Ubuntu or Mint), but any other (e.g., CentOs, OpenSuse) should do as well.
  * Perl 5 (>= 5.10 core; installed by default in most Linux distributions). Check the version with "perl -v"
  * 1GB of RAM.
  * 1 core (it only uses one core per job).
  * At least 1GB HDD.

=head1 HOW TO RUN CREATE-RANDOM-BFF-PXF

The software runs without any argument and assumes defaults. If you want to change some pearmeters please take a look to the synopsis

B<Examples:>

 $ ./csv2json.pl example.csv

=head2 COMMON ERRORS AND SOLUTIONS

 * Error message: Foo
   Solution: Bar

 * Error message: Foo
   Solution: Bar

=head1 AUTHOR 

Written by Manuel Rueda, PhD. Info about CNAG can be found at L<https://www.cnag.crg.eu>.

=head1 COPYRIGHT AND LICENSE

This PERL file is copyrighted. See the LICENSE file included in this distribution.

=cut
