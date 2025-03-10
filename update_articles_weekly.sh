#!/bin/bash

# Script to update VLM articles weekly
# This should be set up as a cron job to run weekly

# Change to the project directory
cd "$(dirname "$0")"

# Activate virtual environment if needed
# source /path/to/your/venv/bin/activate

# Run the article fetcher
python article_fetcher.py

# Log the update
echo "Articles updated on $(date)" >> update_log.txt

# Optional: Push changes to GitHub
git add articles/*.json
git commit -m "Weekly update of articles and attention scores ($(date +%Y-%m-%d))"
git push origin main

echo "Update completed successfully" 