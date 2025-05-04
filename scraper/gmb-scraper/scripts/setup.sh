#!/bin/bash

# Setup script for GMB Scraper Backend
# This script creates the necessary directories and copies the Python scripts

# Create directories
mkdir -p scripts logs exports

# Copy Python scripts to scripts directory
echo "Copying Python scripts..."
cp postcodesscraper.py scripts/
cp gmbscraper.py scripts/
cp emailsdcraper.py scripts/

# Create logs directory if it doesn't exist
mkdir -p logs

# Set permissions
chmod +x scripts/*.py

echo "Setup complete!"
echo "Make sure MongoDB is running on localhost:27017 or update the connection URI in the environment variables."
