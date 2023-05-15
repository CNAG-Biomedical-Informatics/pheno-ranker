#FROM ubuntu
FROM perl:5.36-bullseye

# File Author / Maintainer
MAINTAINER Manuel Rueda <manuel.rueda@cnag.crg.eu>

# Install Linux tools
RUN apt-get update && \
    apt-get -y install gcc unzip make git cpanminus perl-doc vim sudo libperl-dev

# Download Convert-Pheno
WORKDIR /usr/share/
RUN git clone https://github.com/mrueda/pheno-ranker.git

# Install Perl modules
WORKDIR /usr/share/pheno-ranker
RUN cpanm --installdeps .

# Install PyPerler
WORKDIR ex/pyperler
RUN make install 2> install.log

# Add user "dockeruser"
ARG UID=1000
ARG GID=1000

RUN groupadd -g "${GID}" dockeruser \
  && useradd --create-home --no-log-init -u "${UID}" -g "${GID}" dockeruser

# To change default user from root -> dockeruser
#USER dockeruser
