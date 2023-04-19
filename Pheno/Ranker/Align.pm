package Pheno::Ranker::Align;

use strict;
use warnings;
use autodie;
use feature    qw(say);
use List::Util qw(any);

#use List::MoreUtils qw(duplicates);
use Data::Dumper;
use Sort::Naturally qw(nsort);
use Hash::Fold fold => { array_delimiter => ':' };
use Pheno::Ranker::Stats;

use Exporter 'import';
our @EXPORT =
  qw(intra_cohort_comparison compare_and_rank create_alignment recreate_array create_glob_and_ref_hashes  remap_hash create_weigthted_binary_digit_string parse_hpo_json);

use constant DEVEL_MODE => 0;

sub intra_cohort_comparison {

    my ( $ref_binary_hash, $self ) = @_;
    my $out_file                    = $self->{out_file};
    my @sorted_keys_ref_binary_hash = nsort( keys %{$ref_binary_hash} );

    say "Performing INTRA-COHORT compariSon"
      if ( $self->{debug} || $self->{verbose} );

    # Print to  $out_file
    open( my $fh, ">", $out_file );
    say $fh "\t", join "\t", @sorted_keys_ref_binary_hash;

    # NB: It's a symmetric matrix so we could just compute
    #     triangle. However,  R needs the whole matrix
    #     Hammind distance is very fast, but
    #     I will re-implement if time becomes a bottleneck

    # I elements
    for my $i (@sorted_keys_ref_binary_hash) {
        say "Calculating <$i> against the cohort..." if $self->{verbose};
        my $str1 = $ref_binary_hash->{$i};
        print $fh "$i\t";

        # J elements
        for my $j (@sorted_keys_ref_binary_hash) {
            my $str2 = $ref_binary_hash->{$j};
            print $fh hd_fast( $str1, $str2 ), "\t";
        }
        print $fh "\n";
    }
    close $fh;
    say "Matrix saved to <$out_file>" if ( $self->{debug} || $self->{verbose} );
    return 1;
}

sub compare_and_rank {

    my $arg             = shift;
    my $glob_hash       = $arg->{glob_hash};
    my $ref_binary_hash = $arg->{ref_binary_hash};
    my $tar_binary_hash = $arg->{tar_binary_hash};
    my $weight          = $arg->{weight};
    my $self            = $arg->{self};
    my $sort_by         = $self->{sort_by};
    my $align           = $self->{align};
    my $max_out         = $self->{max_out};

    say "Performing COHORT(REF)-PATIENT(TAR) comparison"
      if ( $self->{debug} || $self->{verbose} );

    # Hash for compiling distances
    my $score;

    # Hash for stats
    my $stat;

    my ($tar) = keys %{$tar_binary_hash};
    my $str2 = $tar_binary_hash->{$tar};

    for my $key ( keys %{$ref_binary_hash} ) {    # No need to sort
        my $str1 = $ref_binary_hash->{$key};
        say "Comparing <id:$key> --- <id:$tar>" if $self->{verbose};
        say "REF:$str1\nTAR:$str2\n"
          if ( defined $self->{debug} && $self->{debug} > 1 );
        $score->{$key}{hamming} = hd_fast( $str1, $str2 );
        $score->{$key}{jaccard} = jaccard_similarity( $str1, $str2 );

        # Add values
        push @{ $stat->{hamming_data} }, $score->{$key}{hamming};
        push @{ $stat->{jaccard_data} }, $score->{$key}{jaccard};
    }
    $stat->{hamming_stats} = add_stats( $stat->{hamming_data} );
    $stat->{jaccard_stats} = add_stats( $stat->{jaccard_data} );

    # Initialize a few variables
    my @headers = (
        'RANK',                   'REFERENCE(ID)',
        'TARGET(ID)',             'LENGTH',
        'WEIGHTED',               'HAMMING-DISTANCE',
        'DISTANCE-Z-SCORE',       'DISTANCE-P-VALUE',
        'DISTANCE-Z-SCORE(RAND)', 'JACCARD-INDEX',
        'JACCARD-Z-SCORE',        'JACCARD-P-VALUE'
    );
    my $header  = join "\t", @headers;
    my @results = $header;
    my @alignments;
    my %info;
    my $length_align = length($str2);
    my $weight_bool  = $weight ? 'True' : 'False';

    # Sort %score by value and load results
    my $count = 1;
    $max_out++;    # to be able to start w/ ONE

    # Start loop
    for my $key (
        sort {
            $sort_by eq 'jaccard'           #
              ? $score->{$b}{$sort_by}
              <=> $score->{$a}{$sort_by}    # 1 to 0 (similarity)
              : $score->{$a}{$sort_by}
              <=> $score->{$b}{$sort_by}    # 0 to N (distance)
        } keys %$score
      )
    {

        say "$count: Creating alignment <id:$key>" if $self->{verbose};

        # Create ASCII alignemnt
        my ( $n_00, $alignment ) =
          create_alignment( $ref_binary_hash->{$key}, $str2, $glob_hash );

     # Compute estimated av and dev for binary_string of L = length_align - n_00
     # Corrected length_align L = length_align - n_00
        my $length_align_corrected = $length_align - $n_00;
        ( $stat->{hamming_stats}{mean_rnd}, $stat->{hamming_stats}{sd_rnd} ) =
          estimate_hamming_stats($length_align_corrected);

        # Compute a few stats
        my $hamming_z_score = z_score(
            $score->{$key}{hamming},
            $stat->{hamming_stats}{mean},
            $stat->{hamming_stats}{sd}
        );
        my $hamming_z_score_from_random = z_score(
            $score->{$key}{hamming},
            $stat->{hamming_stats}{mean_rnd},
            $stat->{hamming_stats}{sd_rnd}
        );

        #my $hamming_p_value =
        #  p_value( $score->{$key}{hamming}, $length_align_corrected );
        my $hamming_p_value_from_z_score =
          p_value_from_z_score($hamming_z_score);
        my $jaccard_z_score = z_score(
            $score->{$key}{jaccard},
            $stat->{jaccard_stats}{mean},
            $stat->{jaccard_stats}{sd}
        );
        my $jaccard_p_value_from_z_score =
          p_value_from_z_score( 1 - $jaccard_z_score );

        # Create a hash with formats
        my $format = {
            'RANK'          => { value => $count,       format => undef },
            'REFERENCE(ID)' => { value => $key,         format => undef },
            'TARGET(ID)'    => { value => $tar,         format => undef },
            'WEIGHTED'      => { value => $weight_bool, format => undef },
            'LENGTH' => { value => $length_align_corrected, format => '%6d' },
            'HAMMING-DISTANCE' =>
              { value => $score->{$key}{hamming}, format => '%4d' },
            'DISTANCE-Z-SCORE' =>
              { value => $hamming_z_score, format => '%7.3f' },
            'DISTANCE-P-VALUE' =>
              { value => $hamming_p_value_from_z_score, format => '%12.7f' },
            'DISTANCE-Z-SCORE(RAND)' =>
              { value => $hamming_z_score_from_random, format => '%8.4f' },
            'JACCARD-INDEX' =>
              { value => $score->{$key}{jaccard}, format => '%7.3f' },
            'JACCARD-Z-SCORE' =>
              { value => $jaccard_z_score, format => '%7.3f' },
            'JACCARD-P-VALUE' =>
              { value => $jaccard_p_value_from_z_score, format => '%12.7f' },
        };

        # Serialize results
        my $tmp_str = join "\t", map {
            defined $format->{$_}{format}
              ? sprintf( $format->{$_}{format}, $format->{$_}{value} )
              : $format->{$_}{value}
        } @headers;
        push @results, $tmp_str;

        # To save memory only load if --align
        if ( defined $align ) {

            # Add all of the above to @alignments
            my $sep = ('-') x 80;
            push @alignments, qq/#$header\n$tmp_str\n$sep\n$$alignment/;

            # Add values to info
            $info{$key} = {
                  weighted => $weight_bool eq 'True'
                ? JSON::XS::true
                : JSON::XS::false,
                reference_id            => $key,
                target_id               => $tar,
                reference_binary_string => $ref_binary_hash->{$key},
                target_binary_string    => $str2,
                alignment_length        => $length_align_corrected,
                hamming_distance        => $score->{$key}{hamming},
                hamming_z_score         => $hamming_z_score,
                hamming_p_value         => $hamming_p_value_from_z_score,
                jaccard_similarity      => $score->{$key}{jaccard},
                jaccard_z_score         => $jaccard_z_score,
                jaccard_p_value         => $jaccard_p_value_from_z_score,
                jaccard_distance        => 1 - $score->{$key}{jaccard},
                alignment               => $$alignment,
            };
        }

        $count++;
        last if $count == $max_out;
    }
    return \@results, \%info, \@alignments;
}

sub create_alignment {

    my ( $binary_string1, $binary_string2, $glob_hash ) = @_;

    my $length1 = length($binary_string1);
    my $length2 = length($binary_string2);

    die "The binary strings must have the same length"
      if ( $length1 != $length2 );

    # Expand array to have weights as N-elements
    my $recreated_array = recreate_array($glob_hash);

    my $out          = "REF -- TAR\n";
    my $cum_distance = 0;
    my $n_00         = 0;
    for ( my $i = 0 ; $i < $length1 ; $i++ ) {

        my $char1 = substr( $binary_string1, $i, 1 );
        my $char2 = substr( $binary_string2, $i, 1 );
        $n_00++ if ( $char1 == 0 && $char2 == 0 );
        my $key = $recreated_array->[$i];
        my $val = sprintf( "%3d", $glob_hash->{$key} );
        $i = $i + $glob_hash->{$key} - 1;
        $cum_distance += $glob_hash->{$key} if $char1 ne $char2;
        my $cum_distance_pretty = sprintf( "%3d", $cum_distance );
        my $distance            = $char1 eq $char2 ? 0 : $glob_hash->{$key};
        $distance = sprintf( "%3d", $distance );

        my %format = (
            '11' =>
qq/$char1 ----- $char2 | (w:$val|d:$distance|cd:$cum_distance_pretty|) $key/,
            '10' =>
qq/$char1 xxx-- $char2 | (w:$val|d:$distance|cd:$cum_distance_pretty|) $key/,
            '01' =>
qq/$char1 --xxx $char2 | (w:$val|d:$distance|cd:$cum_distance_pretty|) $key/,
            '00' =>
qq/$char1       $char2 | (w:$val|d:$distance|cd:$cum_distance_pretty|) $key/
        );
        $out .= $format{ $char1 . $char2 } . "\n";

    }
    return $n_00, \$out;
}

sub recreate_array {

    my $glob_hash = shift;

    # *** IMPORTANT ***
    # nsort does not yield same results as canonical from JSON::XS
    my @sorted_keys_glob_hash = sort keys %{$glob_hash};
    my @recreated_array;

    foreach my $key (@sorted_keys_glob_hash) {
        for ( my $i = 0 ; $i < $glob_hash->{$key} ; $i++ ) {
            push @recreated_array, $key;
        }
    }
    return \@recreated_array;

}

sub create_glob_and_ref_hashes {

    my ( $array, $weight, $term_parents, $self ) = @_;
    my $glob_hash = {};
    my $ref_hash_flattened;

    for my $i ( @{$array} ) {
        my $id = $i->{id};
        say "Flattening and remapping <id:$id> ..." if $self->{verbose};
        my $ref_hash = remap_hash(
            {
                hash         => $i,
                weight       => $weight,
                term_parents => $term_parents,
                self         => $self
            }
        );
        $ref_hash_flattened->{$id} = $ref_hash;

        # The idea is to create a $glob_hash with unique key-values
        # Duplicated will be automatically merged
        $glob_hash = { %$glob_hash, %$ref_hash };
    }
    return ( $glob_hash, $ref_hash_flattened );
}

sub prune_excluded_included {

    my ( $hash, $self ) = @_;
    my @included = @{ $self->{included_terms} };
    my @excluded = @{ $self->{excluded_terms} };

    # Die if we have both options at the same time
    die "Sorry, <--include> and <--exclude> are mutually exclusive\n"
      if ( @included && @excluded );

    # *** IMPORTANT ***
    # Original $hash is modified

    # INCLUDED
    if (@included) {
        for my $key ( keys %$hash ) {
            next if $key eq 'id';    # We have to keep $_->{id}
            delete $hash->{$key} unless any { $_ eq $key } @included;
        }
    }

    # EXCLUDED
    if (@excluded) {
        for my $key ( keys %$hash ) {
            delete $hash->{$key} if exists $hash->{$key};
        }
    }

    # We will do nothing if @included = @excluded = [] (DEFAULT)
    return 1;
}

sub undef_excluded_phenotypicFeatures {

    my $hash = shift;

    # Setting the property to undef (it will be discarded later)
    if ( exists $hash->{phenotypicFeatures} ) {
        map { $_ = $_->{excluded} ? undef : $_ }
          @{ $hash->{phenotypicFeatures} };
    }
    return $hash;
}

sub remap_hash {

    my $arg          = shift;
    my $hash         = $arg->{hash};
    my $weight       = $arg->{weight};
    my $term_parents = $arg->{term_parents};
    my $self         = $arg->{self};
    my $out_hash;

    # Do some pruning excluded / included
    prune_excluded_included( $hash, $self );

    # A bit more pruning plus collapsing
    $hash = fold( undef_excluded_phenotypicFeatures($hash) );

    # Create the hash once
    my %id_correspondence = (
        measures                  => 'assayCode.id',
        treatments                => 'treatmentCode.id',
        exposures                 => 'exposureCode.id',
        diseases                  => 'diseaseCode.id',
        phenotypicFeatures        => 'featureType.id',
        interventionsOrProcedures => 'procedureCode.id'
    );

    for my $key ( keys %{$hash} ) {

        # To see which ones were discarded
        #say $key if !defined $hash->{$key};

        # Discard undefined
        next unless defined $hash->{$key};

# Discarding lines with 'low quality' keys (Time of regex profiled with :NYTProf: ms time)
# Some can be "rescued" by adding the ontology as ($1)
        next
          if $key =~
m/info|notes|label|value|\.high|\.low|metaData|familyHistory|excluded|_visit|dateOfProcedure/;

        # Load values
        my $val = $hash->{$key};

        # Discarding lines with val (Time profiled with :NYTProf: ms time)
        next
          if ( $val eq 'NA'
            || $val eq 'Fake'
            || $val eq 'None:No matching concept'
            || $val =~ m/1900-01-01|NA0000|P999Y|P9999Y|ARRAY|phenopacket_id/ );

        # Add IDs to key
        $key = add_id2key( $key, $hash, \%id_correspondence );

        # Finally add value to key
        my $tmp_key = $key . '.' . $val;

        # Add HPO ascendants
        if ( defined $term_parents && $val =~ /^HP:/ ) {
            my $ascendants = add_hpo_ascendants( $tmp_key, $term_parents );
            $out_hash->{$_} = 1 for @$ascendants;    # weight 1 for now
        }

   # Assign weights
   # NB: mrueda (04-12-23) - it's ok if $weight == undef => NO AUTOVIVIFICATION!
   # NB: We don't warn if it does not exists, just assign 1
        $out_hash->{$tmp_key} =
          exists $weight->{$tmp_key} ? $weight->{$tmp_key} : 1;
    }
    return $out_hash;
}

sub add_hpo_ascendants {

    my ( $key, $term_parents ) = @_;
    $key =~ m/HP:(\w+)$/;
    my $hpo_key = 'http://purl.obolibrary.org/obo/HP_' . $1;
    my @ascendants;
    for my $parent_id ( @{ $term_parents->{$hpo_key} } ) {
        $parent_id =~ m/\/(\w+)$/;
        $parent_id = $1;
        $parent_id =~ tr/_/:/;
        my $asc_key = $key . '.asc.' . $parent_id;
        push @ascendants, $asc_key;
    }
    return \@ascendants;
}

sub add_id2key {

    my ( $key, $hash, $id_correspondence ) = @_;
    if ( $key =~
/measures|treatments|exposures|diseases|phenotypicFeatures|interventionsOrProcedures/
      )
    {
        $key =~ m/^(\w+):(\d+)\.(\S+)/;
        my $tmp_key = $1 . ':' . $2 . '.' . $id_correspondence->{$1};
        my $val     = $hash->{$tmp_key};
        $key = $1 . '.' . $val . '.' . $3;
    }
    return $key;
}

sub create_weigthted_binary_digit_string {

    my ( $glob_hash, $cmp_hash ) = @_;
    my $out_hash;

    # *** IMPORTANT ***
    # Being a nested for, keys %{$glob_hash} does not need sorting
    # BUT, we sort to follow the same order as serialized (sorted)
    my @sorted_keys_glob_hash = sort keys %{$glob_hash};

    # IDs of each indidividual
    for my $key1 ( keys %{$cmp_hash} ) {    # no need to sort

        # One-hot encoding = Representing categorical data as numerical
        my $binary_str = '';
        for my $key2 (@sorted_keys_glob_hash) {

            my $ones  = (1) x $glob_hash->{$key2};
            my $zeros = (0) x $glob_hash->{$key2};
            $binary_str .= exists $cmp_hash->{$key1}{$key2} ? $ones : $zeros;
        }
        $out_hash->{$key1} = $binary_str;
    }
    return $out_hash;
}

sub parse_hpo_json {

    my $data = shift;

# The <hp.json> file is a structured representation of the Human Phenotype Ontology (HPO) in JSON format.
# The HPO is structured into a directed acyclic graph (DAG)
# Here's a brief overview of the structure of the hpo.json file:
# - graphs: This key contains an array of ontology graphs. In the case of HPO, there is only one graph. The graph has two main keys:
# - nodes: An array of objects, each representing an HPO term. Each term object has the following keys:
# - id: The identifier of the term (e.g., "HP:0000118").
# - lbl: The label (name) of the term (e.g., "Phenotypic abnormality").
# - meta: Metadata associated with the term, including definition, synonyms, and other information.
# - type: The type of the term, usually "CLASS".
# - edges: An array of objects, each representing a relationship between two HPO terms. Each edge object has the following keys:
# - sub: The subject (child) term ID (e.g., "HP:0000924").
# - obj: The object (parent) term ID (e.g., "HP:0000118").
# - pred: The predicate that describes the relationship between the subject and object terms, typically "is_a" in HPO.
# - meta: This key contains metadata about the HPO ontology as a whole, such as version information, description, and other details.

    my $graph = $data->{graphs}->[0];
    my %nodes = map { $_->{id} => $_ } @{ $graph->{nodes} };
    my %edges = ();

    for my $edge ( @{ $graph->{edges} } ) {
        my $child_id  = $edge->{sub};
        my $parent_id = $edge->{obj};
        push @{ $edges{$child_id} }, $parent_id;
    }
    return \%nodes, \%edges;
}
1;
