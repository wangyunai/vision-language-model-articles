# Vision Language Model Articles

This repository automatically tracks and collects the latest research articles, papers, and news related to Vision Language Models (VLMs).

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