# Use an official Python runtime as the base image
FROM python:3.10

<<<<<<< HEAD
# Set non-interactive frontend for package installers
ENV DEBIAN_FRONTEND=noninteractive

# Install software-properties-common and add deadsnakes PPA for Python 3.12
RUN apt-get update && apt-get install -y software-properties-common
RUN add-apt-repository ppa:deadsnakes/ppa -y

# Install system dependencies including Python and Git
RUN apt-get update && apt-get install -y     python3.12     python3.12-venv     python3-pip     git     && rm -rf /var/lib/apt/lists/*

# Set python3.12 as the default python
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.12 1

# Install our preferred package manager, UV
RUN pip install "uv>=0.1.30"

# Install Python dependencies from requirements.txt
COPY requirements.txt .
RUN uv pip install --no-cache-dir -r requirements.txt --system
    
# Set the working directory inside the container
=======
# Set the working directory in the container
>>>>>>> 8bb7675114549940f808f7d6ac277471255febc5
WORKDIR /app

# Install build tools and dependencies
RUN apt-get update && apt-get install -y \
    libffi-dev \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run the application with uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]