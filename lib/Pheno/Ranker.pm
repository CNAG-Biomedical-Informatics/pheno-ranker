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
use List::Util      qw(all);
use Pheno::Ranker::IO;
use Pheno::Ranker::Align;
use Pheno::Ranker::Stats;

use Exporter 'import';
our @EXPORT_OK = qw($VERSION write_json);

# Global variables:
$Data::Dumper::Sortkeys = 1;
our $VERSION  = '0.00';
our $lib_path = dirname( abs_path(__FILE__) );
use constant DEVEL_MODE => 0;

# Define types
my ( $config, $config_sort_by, $config_max_out, $config_max_number_var );

#my $config_allowed_terms;

############################################
# Start declaring attributes for the class #
############################################

# Complex defaults here
has 'config_file' => (
    default => catfile( $lib_path, '../../conf/config.yaml' ),
    coerce  => sub {
        $_[0] // catfile( $lib_path, '../../conf/config.yaml' );
    },
    is      => 'ro',
    isa     => sub { die "$_[0] is not a valid file" unless -e $_[0] },
    trigger => sub {
        my ( $self, $config_file ) = @_;
        $config                = read_yaml($config_file);
        $config_sort_by        = $config->{sort_by};
        $config_max_out        = $config->{max_out};
        $config_max_number_var = $config->{max_number_var};

        #$config_allowed_terms = ArrayRef [ Enum $config->{allowed_terms} ];
    }
);

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

has max_number_var => (
    default => $config_max_number_var,
    is      => 'ro',
    coerce  => sub { $_[0] // $config_max_number_var },
    isa     => Int
);

has hpo_file => (
    default => catfile( $lib_path, '../../db/hp.json' ),
    coerce  => sub {
        $_[0] // catfile( $lib_path, '../../db/hp.json' );
    },
    is  => 'ro',
    isa => sub { die "$_[0] is not a valid file" unless -e $_[0] },
);

has poi_out_dir => (
    default => catdir('./'),
    coerce  => sub {
        $_[0] // catdir('./');
    },
    is  => 'ro',
    isa => sub { die "$_[0] dir does not exist" unless -d $_[0] },
);

has [qw /include_terms exclude_terms/] => (
    is   => 'ro',
    lazy => 1,

    #isa     =>  ArrayRef [Enum $config->{allowed_terms}], # It's created at compile time and we don't have $config->{allowed_terms}
    isa => sub {
        my $value = shift;
        die "<--include_terms> and <--exclude_terms> must be an array ref"
          unless ref $value eq 'ARRAY';
        die
qq/Invalid term in <--include_terms> or <--exclude_terms>. Allowed values are:\n/,
          ( join ',', @{ $config->{allowed_terms} } ), "\n"
          unless all {
            my $term = $_;
            grep { $_ eq $term } @{ $config->{allowed_terms} }
          } @$value;
    },
    default => sub { [] },
);

# Miscellanea atributes here
has [
    qw/target_file weights_file out_file include_hpo_ascendants align align_basename export log verbose age/
] => ( is => 'ro' );

has [qw /append_prefixes reference_files patients_of_interest/] =>
  ( default => sub { [] }, is => 'ro' );

#has [qw /test print_hidden_labels self_validate_schema path_to_ohdsi_db/] =>
#. ( default => undef, is => 'ro' );

##########################################
# End declaring attributes for the class #
##########################################

sub BUILD {

    # BUILD: is an instance method that is called after the object has been constructed but before it is returned to the caller.
    # BUILDARGS is a class method that is responsible for processing the arguments passed to the constructor (new) and returning a hash reference of attributes that will be used to initialize the object.
    my $self = shift;
    $self->{primary_key}              = $config->{primary_key} // 'id';       # setter;
    $self->{exclude_properties_regex} = $config->{exclude_properties_regex}
      // '';                                                                  # setter

    # ************************
    # Start Miscellanea checks
    # ************************

    # APPEND_PREFIXES
    # Check that we have the right numbers of array elements
    if ( @{ $self->{append_prefixes} } ) {

        # die if used without $self->{append_prefixes}
        die "<--append_prefixes> needs at least 2 cohort files!\n"
          unless @{ $self->{reference_files} } > 1;

        # die if #cohorts and #append-prefixes don't match
        die "Numbers of items in <--r> and <--append-prefixes> don't match!\n"
          unless @{ $self->{reference_files} } == @{ $self->{append_prefixes} };
    }

    # PATIENTS-OF-INTEREST
    if ( @{ $self->{patients_of_interest} } ) {

        # die if used without $self->{append_prefixes}
        die "<--patients-of-interest> needs to be used with <--r>\n"
          unless @{ $self->{reference_files} };
    }

    # **********************
    # End Miscellanea checks
    # **********************
}

sub run {

    my $self = shift;

    #print Dumper $self and die;

    # Load variables
    my $reference_files        = $self->{reference_files};
    my $target_file            = $self->{target_file};
    my $weights_file           = $self->{weights_file};
    my $export                 = $self->{export};
    my $include_hpo_ascendants = $self->{include_hpo_ascendants};
    my $hpo_file               = $self->{hpo_file};
    my $align                  = $self->{align};
    my $align_basename         = $self->{align_basename};
    my $out_file               = $self->{out_file};
    my $cohort_files           = $self->{cohort_files};
    my $append_prefixes        = $self->{append_prefixes};
    my $max_out                = $self->{max_out};
    my $sort_by                = $self->{sort_by};
    my $primary_key            = $self->{primary_key};
    my $poi                    = $self->{patients_of_interest};
    my $poi_out_dir            = $self->{poi_out_dir};

    # die if --align dir does not exist
    my $directory = defined $align ? dirname($align) : '.';
    die "Directory <$directory> does not exist (used with --align)\n"
      unless -d $directory;

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

    ###############################
    # START READING -r | -cohorts #
    ###############################

    # *** IMPORTANT ***
    # We have three modes of operation:
    # 1 - intra-cohort (--r) a.json
    # 2 - inter-cohort (--r) a.json b.json c.json
    # 3 - patient (assigned automatically if -t)

    # *** IMPORTANT ***
    # $ref_data is an array array where each element is the content of the file (e.g, [] or {})
    my $ref_data = [];
    for my $cohort_file ( @{$reference_files} ) {
        die "$cohort_file does not exist\n" unless -f $cohort_file;

        # Load JSON file as Perl data structure
        push @$ref_data,
          io_yaml_or_json(
            {
                filepath => $cohort_file,
                mode     => 'read'
            }
          );
    }

    # In <inter-cohort> we join --cohorts into one but we change the id
    # NB: Re-using $ref_data to save memory
    $ref_data = append_and_rename_primary_key(
        {
            ref_data        => $ref_data,
            append_prefixes => $append_prefixes,
            primary_key     => $primary_key
        }
    );

    ##############################
    # ENDT READING -r | -cohorts #
    ##############################

    #-------------------------------
    # Write json for $poi if --poi |
    #-------------------------------
    # *** IMPORTANT ***
    # It will exit when done (dry-run)
    write_poi(
        {
            ref_data    => $ref_data,
            poi         => $poi,
            poi_out_dir => $poi_out_dir,
            primary_key => $primary_key,
            verbose     => $self->{verbose}
        }
      )
      and exit
      if @$poi;

    # We will process $ref_data to get stats on coverage
    my $coverage_stats = coverage_stats($ref_data);

    # We have to check if we have ####BFF or PXF
    add_attribute( $self, 'format', check_format($ref_data) );    # setter via sub

    # First we create:
    # - $glob_hash => hash with all the COHORT keys possible
    # - $ref_hash  => BIG hash with all individiduals' keys "flattened"
    my ( $glob_hash, $ref_hash ) =
      create_glob_and_ref_hashes( $ref_data, $weight, $self );

    # Limit the number of variables if > $self-{max_number_var}
    # *** IMPORTANT ***
    # Change only performed in $glob_hash
    $glob_hash = randomize_variables( $glob_hash, $self->{max_number_var} )
      if keys %$glob_hash > $self->{max_number_var};

    # Second we peform one-hot encoding for each individual
    my $ref_binary_hash = create_binary_digit_string( $glob_hash, $ref_hash );

    # Hases to be serialized to JSON if <--export>
    my $hash2serialize = {
        glob_hash       => $glob_hash,
        ref_hash        => $ref_hash,
        ref_binary_hash => $ref_binary_hash,
        coverage_stats  => $coverage_stats
    };

    # Perform cohort comparison
    cohort_comparison( $ref_binary_hash, $self ) unless $target_file;

    # Perform patient-to-cohort comparison and rank if (-t)
    if ($target_file) {

        ####################
        # START READING -t #
        ####################

        # local $tar_data is for patient
        my $tar_data = array2object(
            io_yaml_or_json( { filepath => $target_file, mode => 'read' } ) );

        ##################
        # END READING -t #
        ##################

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
          create_binary_digit_string( $glob_hash, $tar_hash );
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

sub append_and_rename_primary_key {

    my $arg             = shift;
    my $ref_data        = $arg->{ref_data};
    my $append_prefixes = $arg->{append_prefixes};
    my $primary_key     = $arg->{primary_key};

    # Premature return if @$ref_data == 1 (only 1 cohort)
    # *** IMPORTANT ***
    # $ref_data->[0] can be ARRAY or HASH
    # We force HASH to be ARRAY
    return ref $ref_data->[0] eq ref {} ? [ $ref_data->[0] ] : $ref_data->[0]
      if @$ref_data == 1;

    # NB: for is a bit faster than map
    my $count = 1;

    # We have to load into a new array data
    my $data;
    for my $item (@$ref_data) {

        my $prefix =
            $append_prefixes->[ $count - 1 ]
          ? $append_prefixes->[ $count - 1 ] . '_'
          : 'C' . $count . '_';

        # ARRAY
        if ( ref $item eq ref [] ) {
            for my $individual (@$item) {
                $individual->{$primary_key} =
                  $prefix . $individual->{$primary_key};
                push @$data, $individual;
            }
        }

        # Object
        else {
            $item->{$primary_key} = $prefix . $item->{$primary_key};
            push @$data, $item;
        }

        # Add $count
        $count++;
    }

    return $data;
}
1;
