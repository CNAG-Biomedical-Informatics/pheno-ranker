package Pheno::Ranker::Graph;

use strict;
use warnings;
use autodie;
use feature qw(say);
use Pheno::Ranker::IO;
use Exporter 'import';
our @EXPORT = qw(matrix2graph);
use constant DEVEL_MODE => 0;

############################
############################
#  SUBROUTINES FOR GRAPHS  #
############################
############################

sub matrix2graph {

    # *** IMPORTANT***
    # Hard-coded in purpose to avoid dependencies (e.g.,Graph)
    
    my $arg     = shift;
    my $input   = $arg->{matrix};
    my $output  = $arg->{graph};
    my $verbose = $arg->{verbose};

    # Open the matrix file to read
    open( my $matrix_fh, '<', $input );

    # Read the first line to get node IDs (headers)
    my $header_line = <$matrix_fh>;
    chomp $header_line;
    my @headers = split /\t/, $header_line;
    shift @headers;    # Remove the initial empty element from the headers list

    # Initialize the nodes and edges arrays
    my ( @nodes, @edges );
    my $threshold = 0.0;

    # Read each subsequent line
    while ( my $line = <$matrix_fh> ) {
        chomp $line;
        my @values  = split /\t/, $line;
        my $node_id = shift @values;    # The first column is the node ID

        # Ensure each node is represented in the node array
        push @nodes, { data => { id => $node_id } };

        # Process each value in the row corresponding to an edge
        for ( my $i = 0 ; $i < scalar @values ; $i++ ) {
            if ( $values[$i] > $threshold ) {
                push @edges,
                  {
                    data => {
                        source => $node_id,
                        target => $headers[$i],
                        weight => $values[$i]
                    }
                  };
            }
        }
    }

    # Close the matrix file handle
    close $matrix_fh;

    # Assemble the complete graph structure
    my %graph = (
        elements => {
            nodes => \@nodes,
            edges => \@edges,
        }
    );

    # Open a file to write JSON output
    say "Writting <$output> file " if $verbose;
    write_json( { filepath => $output, data => \%graph } );

}
1;
