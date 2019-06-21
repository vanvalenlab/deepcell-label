FROM python:3.7

# System maintenance
RUN apt-get update && apt-get install -y \
        git \
        python3-tk \
        mesa-utils \
        xorg-dev \
        libglu1-mesa libgl1-mesa-dev \
        x11vnc \
        xvfb \
        fluxbox \
        wget \
        wmctrl \
        libxinerama1 libxcursor1 \
        libsm6 && \
        rm -rf /var/lib/apt/lists/* && \
        /usr/local/bin/pip install --upgrade pip


# Copy the requirements.txt and install the dependencies
COPY setup.py requirements.txt /opt/mcaliban/
RUN pip install -r /opt/mcaliban/requirements.txt

# Copy the rest of the package code and its scripts
COPY desktop /opt/mcaliban/desktop

# Install deepcell_toolbox via setup.py
RUN pip install /opt/mcaliban


COPY desktop/caliban.py /
COPY desktop/mode.py /
COPY desktop/RAW264_S2_Batch_05.trk /
COPY test1.sh /

#RUN python3 caliban.py

CMD "/test1.sh"



#CMD ["/bin/bash"]