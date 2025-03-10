# Vision Language Model Articles Tracker

This repository tracks and displays the latest research papers and articles related to Vision Language Models (VLMs).

## Features

- Automatically fetches articles from various sources (arXiv, Papers With Code, research blogs, etc.)
- Calculates attention scores based on recency, keywords, and source
- Displays articles in a user-friendly dashboard
- Updates weekly with the latest research

## Dashboard

The dashboard displays:
- Total number of articles
- Unique keywords
- Last added date
- Articles sorted by attention score
- Keyword trends
- Source distribution

## Automatic Updates

The system can be set up to automatically update weekly using a cron job.

### Setting up the Weekly Cron Job

1. Make sure the `update_articles_weekly.sh` script is executable:
   ```bash
   chmod +x update_articles_weekly.sh
   ```

2. Edit your crontab:
   ```bash
   crontab -e
   ```

3. Add a line to run the script weekly (e.g., every Sunday at 2 AM):
   ```
   0 2 * * 0 /full/path/to/update_articles_weekly.sh >> /full/path/to/cron_log.txt 2>&1
   ```

4. Save and exit the editor.

## Manual Updates

You can also update the articles manually by running:

```bash
python article_fetcher.py
```

## Attention Score Calculation

Attention scores are calculated based on:
- Recency (newer articles get higher scores)
- Keywords (articles with more relevant keywords get higher scores)
- Source (articles from prestigious sources get higher scores)
- Citation velocity (if available)

## Troubleshooting

If you encounter issues with dates or attention scores:

1. Run the update script manually to refresh all data:
   ```bash
   ./update_articles_weekly.sh
   ```

2. Check the logs for any errors:
   ```bash
   cat update_log.txt
   ```

3. If needed, you can run the individual fix scripts:
   ```bash
   python update_attention_scores.py  # Updates attention scores
   python update_article_files.py     # Updates individual article files
   ```

## What are Vision Language Models?

Vision Language Models (VLMs) are AI systems that can understand and process both visual and textual information, enabling tasks such as:
- Image captioning
- Visual question answering
- Text-to-image generation
- Multimodal understanding and reasoning

## Repository Contents

- `article_fetcher.py`: Python script that fetches the latest VLM articles from various sources
- `articles/`: Directory containing saved article metadata in JSON format
- `requirements.txt`: List of Python dependencies
- `.github/workflows/`: Automated workflows for periodic article fetching

## Latest Articles

Articles are updated automatically on a weekly basis. Check the `articles/` directory for the latest content or visit the [GitHub Pages site](https://wangyunai.github.io/vision-language-model-articles/) for a more user-friendly view.

## Sources

This repository fetches articles from the following sources:
- arXiv (Computer Vision and Machine Learning categories)
- Major AI research labs' blogs (OpenAI, Google AI, Meta AI, etc.)
- Top ML/AI conferences (CVPR, ICCV, NeurIPS, ICLR, etc.)
- Medium articles and popular AI blogs

## Setup for Local Use

1. Clone this repository:
```bash
git clone https://github.com/wangyunai/vision-language-model-articles.git
cd vision-language-model-articles
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the article fetcher manually:
```bash
python article_fetcher.py
```

## How to Contribute

Contributions are welcome! If you'd like to:
- Add new sources for article fetching
- Improve the filtering algorithm
- Fix bugs or enhance functionality

Please submit a pull request or open an issue.

## License

MIT