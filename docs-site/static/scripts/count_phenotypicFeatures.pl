#!/usr/bin/perl
use strict;
use warnings;
use JSON::XS;

# Read from STDIN only
if (-t STDIN) {  # Check if STDIN is empty (no piped input)
    print STDERR "Usage: zcat input.json.gz | $0\n";
    print STDERR "       cat input.json | $0\n";
    exit 1;
}

# Read the entire JSON content from STDIN
my $json_text = do {
    local $/;
    <STDIN>;
};

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
