#!/usr/bin/perl
use strict;
use warnings;
use JSON::XS;

# Check for input file argument
my $input_file = shift @ARGV or die "Usage: $0 <input.json>\n";

# Open the input file
open my $fh, '<', $input_file or die "Cannot open '$input_file': $!\n";

# Read the entire JSON content from the file
my $json_text = do {
    local $/;
    <$fh>;
};

close $fh;

# Decode JSON
my $json = JSON::XS->new->utf8->decode($json_text);

# Ensure the decoded JSON is an array reference
die "Input JSON is not an array.\n" unless ref($json) eq 'ARRAY';

# Print CSV header
print "key,count\n";

# Iterate through each object in the array
foreach my $obj (@$json) {
    # Ensure the current element is an object with an 'id' field
    next unless ref($obj) eq 'HASH' && exists $obj->{id};
    
    my $id = $obj->{id};
    my $count = 0;
    
    # Check if 'phenotypicFeatures' exists and is an array
    if (exists $obj->{phenotypicFeatures} && ref($obj->{phenotypicFeatures}) eq 'ARRAY') {
        $count = scalar @{ $obj->{phenotypicFeatures} };
    }
    
    # Print the CSV line
    print "\"$id\",$count\n";
}
