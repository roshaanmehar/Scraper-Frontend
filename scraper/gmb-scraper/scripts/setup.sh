#!/bin/bash

# Setup script for GMB Scraper Backend
# This script creates the necessary directories and sets up the environment

# Create directories if they don't exist
mkdir -p logs exports data

# Check if Python files exist in the scripts directory
if [ -f "scripts/postcodesscraper-kX6HPVCskxwKzPvSgMOt4oZXxnrgVU.py" ]; then
    echo "Renaming Python scripts to standard names..."
    cp scripts/postcodesscraper-kX6HPVCskxwKzPvSgMOt4oZXxnrgVU.py scripts/postcodesscraper.py
    cp scripts/emailsdcraper-LQgeh0wJ1tZhKVUSj6Y0OzlZjt8Xbg.py scripts/emailsdcraper.py
    cp scripts/gmbscraper-GJRZiyZyFtd4yO9ctrzSGKLWhj6y3Y.py scripts/gmbscraper.py
    echo "Scripts renamed successfully."
else
    echo "Python scripts not found in scripts directory."
    echo "Please ensure the following files are in the scripts directory:"
    echo "- postcodesscraper-kX6HPVCskxwKzPvSgMOt4oZXxnrgVU.py"
    echo "- emailsdcraper-LQgeh0wJ1tZhKVUSj6Y0OzlZjt8Xbg.py"
    echo "- gmbscraper-GJRZiyZyFtd4yO9ctrzSGKLWhj6y3Y.py"
fi

# Set permissions
chmod +x scripts/*.py 2>/dev/null

# Create backend API structure
mkdir -p app/api/scraper app/api/data app/api/logs

echo "Setup complete!"
echo "Make sure MongoDB is running on localhost:27017 or update the connection URI in the environment variables."
