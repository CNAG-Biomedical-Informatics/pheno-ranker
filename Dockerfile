FROM perl:stable-bullseye

# File Author / Maintainer
LABEL org.opencontainers.image.authors="Manuel Rueda <manuel.rueda@cnag.eu>"

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Ensure that root's PATH includes sbin directories so ldconfig can be found
ENV PATH="/usr/local/sbin:/usr/sbin:/sbin:${PATH}"

# Diagnostic: Print the current PATH and check for ldconfig
RUN echo "Current PATH: $PATH" && \
    echo "Checking for ldconfig:" && \
    which ldconfig || echo "ldconfig not found!"

# Update package lists once
RUN apt-get update

# Install libc-bin and check
RUN apt-get install -y libc-bin && echo "libc-bin installed successfully"

# Install gcc
RUN apt-get install -y gcc && echo "gcc installed successfully"

# Install unzip
RUN apt-get install -y unzip && echo "unzip installed successfully"

# Install make
RUN apt-get install -y make && echo "make installed successfully"

# Install git
RUN apt-get install -y git && echo "git installed successfully"

# Install cpanminus
RUN apt-get install -y cpanminus && echo "cpanminus installed successfully"

# Install perl-doc
RUN apt-get install -y perl-doc && echo "perl-doc installed successfully"

# Install vim
RUN apt-get install -y vim && echo "vim installed successfully"

# Install sudo
RUN apt-get install -y sudo && echo "sudo installed successfully"

# Install libgsl-dev
RUN apt-get install -y libgsl-dev && echo "libgsl-dev installed successfully"

# Install libjson-xs-perl
RUN apt-get install -y libjson-xs-perl && echo "libjson-xs-perl installed successfully"

# Install libperl-dev
RUN apt-get install -y libperl-dev && echo "libperl-dev installed successfully"

# Install python3-pip
RUN apt-get install -y python3-pip && echo "python3-pip installed successfully"

# Install libzbar0
RUN apt-get install -y libzbar0 && echo "libzbar0 installed successfully"

# Run ldconfig explicitly
RUN ldconfig && echo "ldconfig executed successfully"

# Cleanup apt lists to reduce image size
RUN rm -rf /var/lib/apt/lists/*

# Clone the Pheno-Ranker repository
WORKDIR /usr/share/
RUN git clone https://github.com/CNAG-Biomedical-Informatics/pheno-ranker.git

# Install Perl modules (dependencies of pheno-ranker)
WORKDIR /usr/share/pheno-ranker
RUN cpanm --notest --installdeps . && echo "Perl dependencies installed successfully"

# Install Python packages required by the repository
RUN pip3 install -r requirements.txt && echo "Python dependencies installed successfully"

# Create a user "dockeruser" with given UID and GID (defaults to 1000)
ARG UID=1000
ARG GID=1000
RUN groupadd -g "${GID}" dockeruser && \
    useradd --create-home --no-log-init -u "${UID}" -g "${GID}" dockeruser && \
    echo "User dockeruser created successfully"

# Set the working directory for runtime
WORKDIR /usr/share/pheno-ranker

# Default command for the container
CMD ["bash"]
