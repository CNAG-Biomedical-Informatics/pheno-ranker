package Pheno::Ranker::Compare::Remap;

use strict;
use warnings;

use Hash::Fold fold => { array_delimiter => ':' };
use List::Util qw(first);
use Pheno::Ranker::Compare::Ontology qw(add_hpo_ascendants);
use Pheno::Ranker::Compare::Prune
  qw(prune_excluded_included set_excluded_phenotypicFeatures);

use Exporter 'import';
our @EXPORT_OK = qw(remap_hash add_id2key guess_label);

sub remap_hash {
    my $arg          = shift;
    my $hash         = $arg->{hash};
    my $weight       = $arg->{weight};
    my $self         = $arg->{self};            # $self from $arg
    my $nomenclature = $arg->{nomenclature} || {};
    my $nodes        = $self->{nodes};
    my $edges        = $self->{edges};
    my $format       = $self->{format};
    my $switch       = $self->{retain_excluded_phenotypicFeatures};
    my %out_hash;

    # Do some pruning excluded / included
    prune_excluded_included( $hash, $self );

    # *** IMPORTANT ***
    # The user may include a term that:
    # 1 - may not exist in any individual
    # 2 - does not exist in some individuals
    # If the term does not exist in a individual
    #  - a) -include-terms contains ANOTHER TERM THAT EXISTS
    #        %$hash will contain keys => OK
    #  - b) -include-terms only includes the term/terms not present
    #        %$hash  = 0 , then we return {}, to avoid trouble w/ Fold.pm
    return {} unless %$hash;

# A bit more pruning plus folding
# NB: Hash::Fold keeps white spaces on keys
#
# Options for 1D-array folding:
# A) Array to Hash then Fold
# B) Fold then Regex <=== CHOSEN
#  - Avoids the need for deep cloning
#  - Works across any JSON data structure (without specific key requirements)
#  - BUT profiling shows it's ~5-10% slower than 'Array to Hash then Fold'
#  - Does not accommodate specific remappings like 'interpretations.diagnosis.genomicInterpretations'
    set_excluded_phenotypicFeatures( $hash, $switch, $format );
    $hash = fold($hash);

    # Load values for the for loop
    my $exclude_variables_regex_qr = $self->{exclude_variables_regex_qr};
    my $misc_regex_qr =
      qr/1900-01-01|NA0000|NCIT:C126101|P999Y|P9999Y|phenopacket_id/;

# Pre-compile a list of fixed scalar values to exclude into a hash for quick lookup
    my %exclude_values =
      map { $_ => 1 }
      ( 'NA', 'NaN', 'Fake', 'None:No matching concept', 'Not Available' );

    # Now we proceed for each key
    for my $key ( keys %{$hash} ) {

        # Discard undefined
        next unless defined $hash->{$key};

# Discarding lines with 'low quality' keys (Time of regex profiled with :NYTProf: ms time)
# Some can be "rescued" by adding the ontology as ($1)
# NB1: We discard _labels too!!
# NB2: info|metaData are always discarded
        next
          if ( defined $exclude_variables_regex_qr
            && $key =~ $exclude_variables_regex_qr );

        # The user can turn on age related values
        next
          if ( ( $format eq 'PXF' || $format eq 'BFF' )
            && $key =~ m/\.age(?!nt)|onset/i
            && !$self->{age} );    # $self->{age} [0|1]

        # Load values
        my $val = $hash->{$key};

  # Discarding lines with unsupported val (Time profiled with :NYTProf: ms time)
        next
          if (
            ( ref($val) eq 'HASH'
                && !keys %{$val} )   # Discard {} (e.g.,subject.vitalStatus: {})
            || ( ref($val) eq 'ARRAY' && !@{$val} )    # Discard []
            || exists $exclude_values{$val}
            || $val =~ $misc_regex_qr
          );

        # Add IDs to key
        my $id_key = add_id2key( $key, $hash, $self );

        # Finally add value to id_key
        my $tmp_key_at_variable_level = $id_key . '.' . $val;

        # Add HPO ascendants
        if ( defined $edges && $val =~ /^HP:/ ) {
            my $ascendants = add_hpo_ascendants(
                $tmp_key_at_variable_level,
                $nodes, $edges,
                $nomenclature
            );
            $out_hash{$_} = 1 for @$ascendants;    # weight 1 for now
        }

        ##################
        # Assign weights #
        ##################

   # NB: mrueda (04-12-23) - it's ok if $weight == undef => NO AUTOVIVIFICATION!
   # NB: We don't warn if user selection does not exist, just assign 1

        my $tmp_key_at_term_level = $tmp_key_at_variable_level;

        # If variable has . then capture $1
        if ( $tmp_key_at_term_level =~ m/\./ ) {

            # NB: For long str regex is faster than (split /\./, $foo)[0]
            $tmp_key_at_term_level =~ m/^(\w+)\./;
            $tmp_key_at_term_level = $1;
        }

        if ( defined $weight ) {

            # *** IMPORTANT ***
            # ORDER MATTERS !!!!
            # We allow for assigning weights by TERM (e.g., 1D)
            # but VARIABLE level takes precedence to TERM

            $out_hash{$tmp_key_at_variable_level} =

              # VARIABLE LEVEL
              # NB: exists stringifies the weights
              exists $weight->{$tmp_key_at_variable_level}
              ? $weight->{$tmp_key_at_variable_level} + 0   # coercing to number

              # TERM LEVEL
              : exists $weight->{$tmp_key_at_term_level}
              ? $weight->{$tmp_key_at_term_level} + 0       # coercing to number

              # NO WEIGHT
              : 1;

        }
        else {

            # Assign a weight of 1 if no users weights
            $out_hash{$tmp_key_at_variable_level} = 1;

        }

        ##############
        # label Hash #
        ##############

        # Finally we load the Nomenclature hash
        my $label = $key;
        $label =~ s/id/label/;
        $nomenclature->{$tmp_key_at_variable_level} = $hash->{$label}
          if defined $hash->{$label};
    }

    # *** IMPORTANT ***
    # We have to return an object {} when undef
    return \%out_hash // {};
}

sub add_id2key {
    my ( $key, $hash, $self ) = @_;
    my $id_correspondence    = $self->{id_correspondence}{ $self->{format} };
    my $array_regex_qr       = $self->{array_regex_qr};
    my $array_terms_regex_qr = $self->{array_terms_regex_qr};

    #############
    # OBJECTIVE #
    #############

# This subroutine is important as it replaces the index (numeric) for a given
# array element by a selected ontology. It's done for all subkeys on that element

    #"interventionsOrProcedures" : [
    #     {
    #        "bodySite" : {
    #           "id" : "NCIT:C12736",
    #           "label" : "intestine"
    #        },
    #        "procedureCode" : {
    #           "id" : "NCIT:C157823",
    #           "label" : "Colon Resection"
    #        }
    #     },
    #   {
    #        "bodySite" : {
    #           "id" : "NCIT:C12736",
    #           "label" : "intestine"
    #        },
    #        "procedureCode" : {
    #           "id" : "NCIT:C86074",
    #           "label" : "Hemicolectomy"
    #        }
    #     },
    #]
    #
    # Will become:
    #
    #"interventionsOrProcedures.NCIT:C157823.bodySite.id.NCIT:C12736" : 1,
    #"interventionsOrProcedures.NCIT:C157823.procedureCode.id.NCIT:C157823" : 1,
    #"interventionsOrProcedures.NCIT:C86074.bodySite.id.NCIT:C12736" : 1,
    #"interventionsOrProcedures.NCIT:C86074.procedureCode.id.NCIT:C86074" : 1,
    #
    # To make the replacement we use $id_correspondence, then we perform a regex
    # to fetch the key parts

    # Only proceed if $key is one of the array_terms
    if ( $key =~ $array_terms_regex_qr ) {

        # Now we use $array_regex_qr to capture $1, $2 and $3 for BFF/PXF
        # NB: For others (e.g., MXF) we will have only $1 and $2
        $key =~ $array_regex_qr;

        #say "$array_regex_qr -- [$key] <$1> <$2> <$3>"; # $3 can be undefined

        my ( $tmp_key, $val );

        # Normal behaviour for BFF/PXF
        if ( defined $3 ) {

# If id_correspondence is an array (e.g., medicalActions) we have to grep the right match
            my $correspondence;
            if ( ref $id_correspondence->{$1} eq ref [] ) {

                #       $1         $2                 $3
                # <medicalActions> <0> <treatment.routeOfAdministration.id>
                my $subkey = ( split /\./, $3 )[0];    # treatment
                $correspondence =
                  first { $_ =~ m/^$subkey/ }
                  @{ $id_correspondence->{$1} };       # treatment.agent.id
            }
            else {
                $correspondence = $id_correspondence->{$1};
            }

            # Now that we know which is the term we use to find key-val in $hash
            $tmp_key =
                $1 . ':'
              . $2 . '.'
              . $correspondence;    # medicalActions.0.treatment.agent.id
            $val = $hash->{$tmp_key};    # DrugCentral:257
            $key = join '.', $1, $val, $3
              ; # medicalActions.DrugCentral:257.treatment.routeOfAdministration.id
        }

        # MXF or similar (...we haven't encountered other regex yet)
        else {

            $tmp_key = $1 . ':' . $2;
            $val     = $hash->{$tmp_key};
            $key     = $1;
        }
    }

    # $key = 'Bar:1' means that we have array but the user either:
    #  a) Made a mistake in the config
    #  b) Is not using the right config file
    else {
        die
"<$1> contains array elements but is not defined as an array in <$self->{config_file}>. Please check your syntax and configuration file.\n"
          if $key =~ m/^(\w+):/;
    }

    return $key;
}

sub guess_label {
    my $input_string = shift;

    if (
        $input_string =~ /\.      # Match a literal dot
                       ([^\.]+)  # Match and capture everything except a dot
                       $        # Anchor to the end of the string
                      /x
      )
    {
        return $1;
    }

    # If no dot is found, return the original string
    return $input_string;
}

1;
