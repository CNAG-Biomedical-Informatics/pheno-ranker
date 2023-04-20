package Pheno::Ranker;

use strict;
use warnings;
use autodie;
use feature qw(say);
use Data::Dumper;
use File::Basename        qw(dirname);
use Cwd                   qw(abs_path);
use File::Spec::Functions qw(catdir catfile);
use Moo;
use Types::Standard qw(Str Int Num Enum ArrayRef Undef);
use Pheno::Ranker::IO;
use Pheno::Ranker::Align;
use Pheno::Ranker::Stats;

use Exporter 'import';
our @EXPORT_OK = qw($VERSION write_json);

# Global variables:
our $VERSION  = '1.0.0';
our $lib_path = dirname( abs_path(__FILE__) );

$Data::Dumper::Sortkeys = 1;
use constant DEVEL_MODE => 0;

# Module variables
my @beacon_v2_terms =
  qw(diseases ethnicity exposures geographicOrigin id info interventionsOrProcedures karyotypicSex measures pedigrees phenotypicFeatures sex treatments);
my @phenopackets_v2_terms =
  qw(id subject phenotypicFeatures measurements biosamples interpretations diseases medicalActions files metaData);
my $allowed_terms =
  ArrayRef [ Enum [ @beacon_v2_terms, @phenopackets_v2_terms ] ]; # The error appears twice

############################################
# Start declaring attributes for the class #
############################################

# Complex defaults here
has sort_by => (

    default => 'hamming',
    is      => 'ro',
    coerce  => sub { $_[0] // 'hamming' },
    isa     => Enum [qw(hamming jaccard)]
);

has max_out => (
    default => 50,                    # Limit to speed up runtime
    is      => 'ro',
    coerce  => sub { $_[0] // 50 },
    isa     => Int
);

has hpo_file => (

    hpo_file => catfile( $lib_path, '../db/hp.json' ),
    coerce   => sub {
        $_[0] // catfile( $lib_path, '../db/hp.json' );
    },
    is  => 'ro',
    isa => Str
);

# Miscellanea atributes here
#has [qw /test print_hidden_labels self_validate_schema path_to_ohdsi_db/] =>
#. ( default => undef, is => 'ro' );

#has [qw /stream ohdsi_db/] => ( default => 0, is => 'ro' );

has [qw /included_terms excluded_terms/] =>
  ( default => sub { [] }, is => 'ro', isa => $allowed_terms );

has [
    qw/reference_file target_file weights_file out_file hpo align align_file export log verbose/
] => ( is => 'ro' );

#has [qw /data method /] => ( is => 'rw' );

##########################################
# End declaring attributes for the class #
##########################################

sub run {

    my $self = shift;

    #print Dumper $self and die;

    # Load variables
    my $reference_file = $self->{reference_file};
    my $target_file    = $self->{target_file};
    my $weights_file   = $self->{weights_file};
    my $export         = $self->{export};
    my $hpo            = $self->{hpo};
    my $hpo_file       = $self->{hpo_file};
    my $align          = $self->{align};
    my $align_file     = $self->{align_file};
    my $out_file       = $self->{out_file};
    my $max_out        = $self->{max_out};
    my $sort_by        = $self->{sort_by};

    # Load JSON files as Perl data structure
    my $ref_data = read_json($reference_file);

    # We assing weights if <--w>
    # NB: The user can exclude variables by using variable: 0
    my $weight =
      ( $weights_file && -f $weights_file ) ? read_yaml($weights_file) : undef;

    # Now we load $hpo_nodes, $hpo_edges if --hpo
    my $nodes = my $term_parents = undef;
    ( $nodes, $term_parents ) = parse_hpo_json( read_json($hpo_file) ) if $hpo;

    # First we create:
    # - $glob_hash => hash with all the cohort keys possible
    # - $ref_hash  => BIG hash with all individiduals' keys "flattened"
    my ( $glob_hash, $ref_hash ) =
      create_glob_and_ref_hashes( $ref_data, $weight, $term_parents, $self );

    # Second we peform one-hot encoding for each individual
    my $ref_binary_hash =
      create_weigthted_binary_digit_string( $glob_hash, $ref_hash );

    # Hases to be serialized to JSON if <--export>
    my $hash2serialize = {
        glob_hash       => $glob_hash,
        ref_hash        => $ref_hash,
        ref_binary_hash => $ref_binary_hash
    };

    # Perform intra-cohort comparison if <--r>
    intra_cohort_comparison( $ref_binary_hash, $self ) unless $target_file;

    # Perform patient-to-cohort comparison and rank if <--t>
    if ($target_file) {
        my $tar_data = read_json($target_file);

        # The target file has to have $_->{id} otherwise die
        die
"Sorry, <$target_file> does not contain <id> term and it's mandatory\n"
          unless exists $tar_data->{id};

        # We store {id} as a variable as it might be deleted from $tar_data (--excluded-terms id)
        my $tar_data_id = $tar_data->{id};

        # Now we load the rest of the hashes
        my $tar_hash = {
            $tar_data_id  => remap_hash(
                {
                    hash         => $tar_data,
                    weight       => $weight,
                    term_parents => $term_parents,
                    self         => $self
                }
            )
        };
        my $tar_binary_hash =
          create_weigthted_binary_digit_string( $glob_hash, $tar_hash );
        my ( $results_rank, $results_align, $alignments_array ) =
          compare_and_rank(
            {
                glob_hash       => $glob_hash,
                ref_binary_hash => $ref_binary_hash,
                tar_binary_hash => $tar_binary_hash,
                weight          => $weight,
                self            => $self
            }
          );

        # Print Ranked results to STDOUT
        say join "\n", @$results_rank;

        # Write TXT for alignment
        write_alignment( $align ? $align : $align_file, $alignments_array )
          if defined $align;

        # Load keys into hash if <--e>
        if ($export) {
            $hash2serialize->{tar_hash}        = $tar_hash;
            $hash2serialize->{tar_binary_hash} = $tar_binary_hash;
            $hash2serialize->{alignment_hash}  = $results_align
              if defined $align;
        }
    }

    # Dump to JSON if <--export>
    serialize_hashes($hash2serialize) if $export;

}
1;
