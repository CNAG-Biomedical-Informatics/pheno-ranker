package Pheno::Ranker::Compare::Matrix;

use strict;
use warnings;
use autodie;
use feature qw(say);

use Sort::Naturally qw(nsort);

use Pheno::Ranker::Metrics;

use Exporter 'import';
our @EXPORT_OK = qw(cohort_comparison);

sub cohort_comparison {
    my ( $ref_binary_hash, $self ) = @_;
    my $out_file          = $self->{out_file};
    my $similarity_metric = $self->{similarity_metric_cohort};

    # Define limit #items for switching to whole matrix calculation
    my $max_items = $self->{max_matrix_records_in_ram};

    # Inform about the start of the comparison process
    say "Performing COHORT comparison"
      if ( $self->{debug} || $self->{verbose} );

    # Define the subroutine to be used
    my %similarity_function = (
        'hamming' => \&hd_fast,
        'jaccard' => \&jaccard_similarity_formatted
    );

    # Define values for diagonal elements depending on metric
    my %similarity_diagonal = (
        'hamming' => 0,
        'jaccard' => 1
    );

    # Use previous hashes to define stuff
    my $metric              = $similarity_function{$similarity_metric};
    my $similarity_diagonal = $similarity_diagonal{$similarity_metric};

    # Sorting keys of the hash
    my @sorted_keys_ref_binary_hash = nsort( keys %{$ref_binary_hash} );
    my $num_items                   = scalar @sorted_keys_ref_binary_hash;

    # Define $switch for going from RAM to all calculations
    my $switch = $num_items > $max_items ? 1 : 0;

    say "RAM efficient mode is: "
      . ( $switch ? "on" : "off" )
      . " (max_matrix_records_in_ram: $max_items)"
      if ( $self->{debug} || $self->{verbose} );

    # Opening file for output
    open( my $fh, '>:encoding(UTF-8)', $out_file );
    say $fh "\t", join "\t", @sorted_keys_ref_binary_hash;

    # Initialize matrix for storing similarity
    my @matrix;

    # Iterate over items (I elements)
    for my $i ( 0 .. $#sorted_keys_ref_binary_hash ) {
        say "Calculating <"
          . $sorted_keys_ref_binary_hash[$i]
          . "> against the cohort..."
          if $self->{verbose};
        my $str1 = $ref_binary_hash->{ $sorted_keys_ref_binary_hash[$i] }
          {binary_digit_string_weighted};

        # Print first column (w/o \t)
        print $fh $sorted_keys_ref_binary_hash[$i];

        # Iterate for pairwise comparisons (J elements)
        for my $j ( 0 .. $#sorted_keys_ref_binary_hash ) {
            my $str2 = $ref_binary_hash->{ $sorted_keys_ref_binary_hash[$j] }
              {binary_digit_string_weighted};
            my $similarity;

            if ($switch) {

                # For large datasets compute upper and lower triange
                my $str2 =
                  $ref_binary_hash->{ $sorted_keys_ref_binary_hash[$j] }
                  {binary_digit_string_weighted};
                $similarity =
                  $i == $j ? $similarity_diagonal : $metric->( $str1, $str2 );
            }
            else {
                if ( $i == $j ) {

                    # Similarity for diagonal elements
                    $similarity = $similarity_diagonal;
                }
                elsif ( $j > $i ) {

                    # Compute similarity for large cohorts or upper triangle
                    $similarity = $metric->( $str1, $str2 );
                    $matrix[$i][$j] = $similarity;
                }
                else {
                    # Use precomputed similarity from lower triangle
                    $similarity = $matrix[$j][$i];
                }
            }

            # Print a tab before each similarity
            print $fh "\t", $similarity;
        }

        print $fh "\n";
    }

    # Close the file handle
    close $fh;

    # Inform about the completion of the matrix computation
    say "Matrix saved to <$out_file>" if ( $self->{debug} || $self->{verbose} );
    return 1;
}

1;
