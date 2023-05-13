#!/usr/bin/env perl
#
#   A script that creates a JSON array of random BFF/PXF
#
#   Note: Monarch has a more sophisticated version at:
#   https://github.com/monarch-initiative/PhenoImp
#
#   Last Modified: May/05/2023
#
#   Version 1.0.0
#
#   Copyright (C) 2023 Manuel Rueda - CNAG (manuel.rueda@cnag.crg.eu)
#
#   If this program helps you in your research, please cite.
use strict;
use warnings;
use Getopt::Long qw(:config no_ignore_case);
use Pod::Usage;

my $format             = 'bff';
my $number             = 100;
my $out_file           = 'individuals.json';
my $phenotypicFeatures = 1;
my $diseases           = 1;
my $treatments         = 1;
my $VERSION            = '1.0.0';

# Reading arguments
GetOptions(
    'format|f=s'               => \$format,                                    # string
    'n=i'                      => \$number,                                    # string
    'o=s'                      => \$out_file,                                  # string
    'phenotypicFeatures=i'     => \$phenotypicFeatures,                        # integer
    'max-phenotypicFeatures=i' => \my $max_phenotypicFeatures,                 # integer
    'diseases=i'               => \$diseases,                                  # integer
    'max-diseases=i'           => \my $max_diseases,                           # integer
    'treatments=i'             => \$treatments,                                # integer
    'max-treatments=i'         => \my $max_treatments,                         # integer
    'help|?'                   => \my $help,                                   # flag
    'man'                      => \my $man,                                    # flag
    'debug=i'                  => \my $debug,                                  # integer
    'verbose|'                 => \my $verbose,                                # flag
    'version|V'                => sub { print "$0 Version $VERSION\n"; exit; }
) or pod2usage(2);
pod2usage(1)                              if $help;
pod2usage( -verbose => 2, -exitval => 0 ) if $man;

# Create object
my $randomize = Randomizer->new(
    {
        phenotypicFeatures     => $phenotypicFeatures,
        diseases               => $diseases,
        treatments             => $treatments,
        max_phenotypicFeatures => $max_phenotypicFeatures,
        max_diseases           => $max_diseases,
        max_treatments         => $max_treatments
    }
);

# Run method
$randomize->run;

package Randomizer;

use strict;
use warnings;
use autodie;
use feature qw(say);

#use Data::Printer;
use Data::Dumper;
use Path::Tiny;
use List::Util qw(head shuffle);
use JSON::XS;
use Data::Fake qw(Core Company Dates Names);
use FindBin    qw($Bin);
use lib $Bin;
use Ontologies qw($hpo_array $omim_array $rxnorm_array $ethnicity_array);

sub new {
    my ( $class, $self ) = @_;
    bless $self, $class;
    return $self;
}

sub run {

    my $self = shift;
    my %func = (
        bff => \&bff_generator,
        pxf => \&pxf_generator
    );

    #########
    # START #
    #########

    my $json_data;
    for ( my $i = 1 ; $i <= $number ; $i++ ) {
        push @$json_data, $func{$format}->( $i, $self );
    }

    #######
    # END #
    #######
    #p $json_data;

    # Serialize the data and write
    write_json( { filepath => $out_file, data => $json_data } );
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

sub pxf_generator {

    my ( $id, $self ) = @_;
    my $n_pF               = $self->{phenotypicFeatures};
    my $n_d                = $self->{diseases};
    my $n_t                = $self->{treatments};
    my $max_pF             = $self->{max_phenotypicFeatures};
    my $max_d              = $self->{max_diseases};
    my $max_t              = $self->{max_treatments};
    my $phenotypicFeatures = phenotypicFeatures( 'pxf', $n_pF, $max_pF );
    my $diseases           = diseases( 'pxf', $n_d, $max_d );
    my $treatments         = treatments( 'pxf', $n_t, $max_t );
    my $pxf                = fake_hash(
        {
            id      => "Phenopacket_" . $id,
            subject => {
                id  => "IndividualId_" . $id,
                age => {
                    iso8601duration =>
                      fake_template( "P%dY", fake_int( 1, 99 ) )
                },
                sex => fake_pick( 'MALE', 'FEMALE' )
            },
            phenotypicFeatures => $phenotypicFeatures,
            diseases           => $diseases,
            medicalActions     => $treatments
        }
    );
    return $pxf->();
}

sub bff_generator {

    my ( $id, $self ) = @_;
    my $n_pF               = $self->{phenotypicFeatures};
    my $n_d                = $self->{diseases};
    my $n_t                = $self->{treatments};
    my $max_pF             = $self->{max_phenotypicFeatures};
    my $max_d              = $self->{max_diseases};
    my $max_t              = $self->{max_treatments};
    my $phenotypicFeatures = phenotypicFeatures( 'bff', $n_pF, $max_pF );
    my $diseases           = diseases( 'bff', $n_d, $max_d );
    my $treatments         = treatments( 'bff', $n_t, $max_t );

    my $bff = fake_hash(
        {
            id        => "Beacon_" . $id,
            ethnicity => fake_pick(@$ethnicity_array),
            sex       => fake_pick(
                { id => "NCIT:C20197", label => "Male" },
                { id => "NCIT:C16576", label => "Female" }
            ),
            phenotypicFeatures => $phenotypicFeatures,
            diseases           => $diseases,
            treatments         => $treatments
        }
    );
    return $bff->();
}

sub phenotypicFeatures {

    my ( $format, $n, $max ) = @_;
    my $type           = $format eq 'bff' ? 'featureType' : 'type';
    my $onset          = $format eq 'bff' ? 'ageOfOnset'  : 'onset';
    my $shuffled_slice = shuffle_slice( $max, $hpo_array );
    my $array;
    for ( my $i = 0 ; $i < $n ; $i++ ) {
        push @$array,
          {
            $type  => $shuffled_slice->[$i],
            $onset => {
                age => {
                    iso8601duration =>
                      fake_template( "P%dY", fake_int( 1, 99 ) )
                }
            }
          };
    }
    return $array;
}

sub diseases {

    my ( $format, $n, $max ) = @_;
    my $type           = $format eq 'bff' ? 'diseaseCode' : 'term';
    my $onset          = $format eq 'bff' ? 'ageOfOnset'  : 'onset';
    my $shuffled_slice = shuffle_slice( $max, $omim_array );
    my $array;
    for ( my $i = 0 ; $i < $n ; $i++ ) {
        push @$array,
          {
            $type  => $shuffled_slice->[$i],
            $onset => {
                age => {
                    iso8601duration =>
                      fake_template( "P%dY", fake_int( 1, 99 ) )
                }
            }
          };
    }
    return $array;
}

sub treatments {

    my ( $format, $n, $max ) = @_;
    my $shuffled_slice = shuffle_slice( $max, $rxnorm_array );
    my $array;
    for ( my $i = 0 ; $i < $n ; $i++ ) {
        push @$array,
          $format eq 'bff'
          ? { treatmentCode => $shuffled_slice->[$i] }
          : { treatment     => { agent => $shuffled_slice->[$i] } };
    }
    return $array;
}

sub shuffle_slice {

    my ( $max, $array ) = @_;

    #my @items = sample $count, @values; # 1.54 List::Util
    my @slice = defined $max ? head $max, @$array : @$array;   # slice of refs
    my @shuffled_slice = shuffle @slice;
    return wantarray ? @shuffled_slice : \@shuffled_slice;
}
1;

=head1 NAME

create_random_bff_pxf.pl: A script that creates a JSON array of random BFF/PXF

=head1 SYNOPSIS


create_random_bff_pxf.pl [-options]

     Options:

       -diseases                      Number of [1]
       -phenotypicFeatures            IDEM
       -treatments                    IDEM
       -max-diseases                  To narrow the selection to N first array elements
       -max-phenotypicFeatures        IDEM
       -max-treatments                IDEM
       -o                             Output file [individuals.json]


       -debug                         Print debugging (from 1 to 5, being 5 max)
       -f                             Format [>bff|pxf]
       -h|help                        Brief help message
       -n                             Number of individuals
       -man                           Full documentation
       -v|verbose                     Verbosity on
       -V|version                     Print version

=head1 DESCRIPTION

A script that creates a JSON array of random BFF/PXF

=head1 SUMMARY

A script that creates a JSON array of random BFF/PXF

=head1 INSTALLATION

 $ cpanm sudo --installdeps .

=head3 System requirements

  * Ideally a Debian-based distribution (Ubuntu or Mint), but any other (e.g., CentOs, OpenSuse) should do as well.
  * Perl 5 (>= 5.10 core; installed by default in most Linux distributions). Check the version with "perl -v"
  * 1GB of RAM.
  * 1 core (it only uses one core per job).
  * At least 1GB HDD.

=head1 HOW TO RUN CREATE-RANDOM-BFF-PXF

The software runs without any argument and assumes defaults. If you want to change some pearmeters please take a look to the synopsis

B<Examples:>

 $ ./create_random_bff_pxf.pl -f pxf  # BFF with 100 samples

 $ ./create_random_bff_pxf.pl -f pxf -n 1000 -o pxf.json # PXF with 1K samples and saved to pxf.json

 $ ./create_random_bff_pxf.pl -phenotypicFeatures 10 # BFF with 100 samples and 10 pF each

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
