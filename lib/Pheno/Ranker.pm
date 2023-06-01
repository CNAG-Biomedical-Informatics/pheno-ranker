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
use Types::Standard qw(Str Int Num Enum ArrayRef HashRef Undef);
use Pheno::Ranker::IO;
use Pheno::Ranker::Align;
use Pheno::Ranker::Stats;

use Exporter 'import';
our @EXPORT_OK = qw($VERSION write_json);

# Global variables:
$Data::Dumper::Sortkeys = 1;
our $VERSION  = '1.0.0';
our $lib_path = dirname( abs_path(__FILE__) );
use constant DEVEL_MODE => 0;

# Read and load config file
my $config = read_yaml( catfile( $lib_path, "../../conf/config.yaml" ) );
my $config_sort_by       = $config->{sort_by};
my $config_max_out       = $config->{max_out};
my $config_allowed_terms = ArrayRef [ Enum $config->{allowed_terms} ];    # The error appears twice

############################################
# Start declaring attributes for the class #
############################################

# Complex defaults here
has sort_by => (
    default => $config_sort_by,
    is      => 'ro',
    coerce  => sub { $_[0] // $config_sort_by },
    isa     => Enum [qw(hamming jaccard)]
);

has max_out => (
    default => $config_max_out,                    # Limit to speed up runtime
    is      => 'ro',
    coerce  => sub { $_[0] // $config_max_out },
    isa     => Int
);

has hpo_file => (
    default => catfile( $lib_path, '../../db/hp.json' ),
    coerce  => sub {
        $_[0] // catfile( $lib_path, '../../db/hp.json' );
    },
    is  => 'ro',
    isa => Str
);

# Miscellanea atributes here
has [qw /include_terms exclude_terms/] => (
    is      => 'ro',
    lazy    => 1,
    isa     => $config_allowed_terms,
    default => sub { [] },
);

has [
    qw/reference_file target_file weights_file config_file out_file include_hpo_ascendants align align_basename export log verbose age/
] => ( is => 'ro' );

has [qw /config/] => (  is => 'rw', isa => HashRef );

#has [qw /test print_hidden_labels self_validate_schema path_to_ohdsi_db/] =>
#. ( default => undef, is => 'ro' );

#has [qw /stream ohdsi_db/] => ( default => 0, is => 'ro' );

##########################################
# End declaring attributes for the class #

sub BUILD {

    my $self = shift;
    $self->{primary_key} = $config->{primary_key}; # setter; 
    $self->{exclude_properties_regex} = $config->{exclude_properties_regex}; # setter
}

sub run {

    my $self = shift;

    #print Dumper $self and die;

    # Load variables
    my $reference_file         = $self->{reference_file};
    my $target_file            = $self->{target_file};
    my $weights_file           = $self->{weights_file};
    my $export                 = $self->{export};
    my $include_hpo_ascendants = $self->{include_hpo_ascendants};
    my $hpo_file               = $self->{hpo_file};
    my $align                  = $self->{align};
    my $align_basename         = $self->{align_basename};
    my $out_file               = $self->{out_file};
    my $max_out                = $self->{max_out};
    my $sort_by                = $self->{sort_by};
    my $primary_key            = $self->{primary_key};

    # Load JSON file as Perl data structure
    my $ref_data = io_yaml_or_json(
        {
            filepath => $reference_file,
            mode     => 'read'
        }
    );

    # We have to check if we have BFF or PXF
    add_attribute( $self, 'format', check_format($ref_data) );    # setter via sub

    # We assing weights if <--w>
    # NB: The user can exclude variables by using variable: 0
    my $weight = validate_json($weights_file);

    # Now we load $hpo_nodes, $hpo_edges if --include_hpo_ascendants
    # NB: we load them within $self to minimize the #args
    my $nodes = my $edges = undef;
    ( $nodes, $edges ) = parse_hpo_json( read_json($hpo_file) )
      if $include_hpo_ascendants;
    $self->{nodes} = $nodes;    # setter
    $self->{edges} = $edges;    # setter

    # First we create:
    # - $glob_hash => hash with all the COHORT keys possible
    # - $ref_hash  => BIG hash with all individiduals' keys "flattened"
    my ( $glob_hash, $ref_hash ) =
      create_glob_and_ref_hashes( $ref_data, $weight, $self );

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
        my $tar_data = array2object(
            io_yaml_or_json( { filepath => $target_file, mode => 'read' } ) );

        # The target file has to have $_->{$primary_key} otherwise die
        die
"Sorry, <$target_file> does not contain <id> term and it's mandatory\n"
          unless exists $tar_data->{$primary_key};

        # We store {primary_key} as a variable as it might be deleted from $tar_data (--excluded-terms id)
        my $tar_data_id = $tar_data->{$primary_key};

        # Now we load the rest of the hashes
        my $tar_hash = {
            $tar_data_id => remap_hash(
                {
                    hash   => $tar_data,
                    weight => $weight,
                    self   => $self
                }
            )
        };

        # *** IMPORTANT ***
        # The target binary is created from matches to $glob_hash
        # Thus, it does not include variables ONLY present in TARGET
        my $tar_binary_hash =
          create_weigthted_binary_digit_string( $glob_hash, $tar_hash );
        my (
            $results_rank,        $results_align, $alignment_ascii,
            $alignment_dataframe, $alignment_csv
          )
          = compare_and_rank(
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
        write_alignment(
            {
                align     => $align ? $align : $align_basename,
                ascii     => $alignment_ascii,
                dataframe => $alignment_dataframe,
                csv       => $alignment_csv
            }
        ) if defined $align;

        # Load keys into hash if <--e>
        if ($export) {
            $hash2serialize->{tar_hash}        = $tar_hash;
            $hash2serialize->{tar_binary_hash} = $tar_binary_hash;
            $hash2serialize->{alignment_hash}  = $results_align
              if defined $align;
        }
    }

    # Dump to JSON if <--export>
    # NB: Must work for -r and -t
    serialize_hashes($hash2serialize) if $export;

}

sub add_attribute {

    #  Bypassing the encapsulation provided by Moo
    my ( $self, $name, $value ) = @_;
    $self->{$name} = $value;
    return 1;
}
1;
