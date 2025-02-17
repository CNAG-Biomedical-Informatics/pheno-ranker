FROM perl:stable-bullseye

# File Author / Maintainer
LABEL org.opencontainers.image.authors="Manuel Rueda <manuel.rueda@cnag.eu>"

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Ensure that root's PATH includes sbin directories so ldconfig is found
ENV PATH="/usr/local/sbin:/usr/sbin:/sbin:${PATH}"

# Diagnostic: Print the current PATH and check for ldconfig
RUN echo "Current PATH: $PATH" && \
    echo "Before override, ldconfig is located at: $(which ldconfig || echo 'not found')" && \
    ls -l $(which ldconfig || echo '/sbin/ldconfig')

# Override ldconfig with /bin/true to bypass its execution in libc-bin’s postinst script
# (This prevents the segfault under QEMU. In a container this is generally safe.)
RUN ln -sf /bin/true /sbin/ldconfig && \
    echo "ldconfig overridden to /bin/true" && \
    which ldconfig && ldconfig

# Update package lists
RUN apt-get update

# Install libc-bin first
RUN apt-get install -y libc-bin && echo "libc-bin installed successfully"

# Install individual dependencies
RUN apt-get install -y gcc && echo "gcc installed successfully"
RUN apt-get install -y unzip && echo "unzip installed successfully"
RUN apt-get install -y make && echo "make installed successfully"
RUN apt-get install -y git && echo "git installed successfully"
RUN apt-get install -y cpanminus && echo "cpanminus installed successfully"
RUN apt-get install -y perl-doc && echo "perl-doc installed successfully"
RUN apt-get install -y vim && echo "vim installed successfully"
RUN apt-get install -y sudo && echo "sudo installed successfully"
RUN apt-get install -y libgsl-dev && echo "libgsl-dev installed successfully"
RUN apt-get install -y libjson-xs-perl && echo "libjson-xs-perl installed successfully"
RUN apt-get install -y libperl-dev && echo "libperl-dev installed successfully"
RUN apt-get install -y python3-pip && echo "python3-pip installed successfully"
RUN apt-get install -y libzbar0 && echo "libzbar0 installed successfully"

# Cleanup apt lists to reduce image size
RUN rm -rf /var/lib/apt/lists/*

# Clone the Pheno-Ranker repository
WORKDIR /usr/share/
RUN git clone https://github.com/CNAG-Biomedical-Informatics/pheno-ranker.git

# Install Perl dependencies
WORKDIR /usr/share/pheno-ranker
RUN cpanm --notest --installdeps . && echo "Perl dependencies installed successfully"

# Install Python requirements
RUN pip3 install -r requirements.txt && echo "Python dependencies installed successfully"

# Create a user "dockeruser" (with default UID and GID of 1000)
ARG UID=1000
ARG GID=1000
RUN groupadd -g "${GID}" dockeruser && \
    useradd --create-home --no-log-init -u "${UID}" -g "${GID}" dockeruser && \
    echo "User dockeruser created successfully"

# Set working directory for runtime
WORKDIR /usr/share/pheno-ranker

# Default command
CMD ["bash"]
