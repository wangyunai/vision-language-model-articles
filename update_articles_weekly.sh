#!/bin/bash

# Script to update VLM articles weekly
# This should be set up as a cron job to run weekly

# Change to the project directory
cd "$(dirname "$0")"

# Activate virtual environment if needed
# source /path/to/your/venv/bin/activate

# Run the article fetcher
python article_fetcher.py

# Copy paper_attention.json to the correct location for the dashboard
cp articles/paper_attention.json paper_attention.json
echo "Copied paper_attention.json to root directory for dashboard"

# Log the update
echo "Articles updated on $(date)" >> update_log.txt

# Optional: Push changes to GitHub
git add articles/*.json paper_attention.json
git commit -m "Weekly update of articles and attention scores ($(date +%Y-%m-%d))"
git push origin main

echo "Update completed successfully" 