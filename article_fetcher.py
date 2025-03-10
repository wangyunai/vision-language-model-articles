#!/usr/bin/env python3
"""
VLM Article Fetcher

This script fetches the latest articles related to Vision Language Models from various sources
including arXiv, research blogs, and conference publications.
"""

import os
import json
import requests
import datetime
import re
import time
from bs4 import BeautifulSoup
import feedparser
import logging
from urllib.parse import quote_plus

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("article_fetcher.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("vlm_fetcher")

# Create articles directory if it doesn't exist
os.makedirs('articles', exist_ok=True)

# Constants
ARXIV_API_URL = "http://export.arxiv.org/api/query"
VLM_KEYWORDS = [
    "vision language model", "VLM", "multimodal", "vision-language", 
    "image-text", "visual-textual", "CLIP", "DALL-E", "Stable Diffusion",
    "GPT-4V", "vision transformer", "visual BERT", "image captioning",
    "visual question answering", "VQA", "text-to-image", "image-to-text"
]

class ArticleFetcher:
    def __init__(self):
        self.articles = []
        self.existing_articles = self._load_existing_articles()
    
    def _load_existing_articles(self):
        """Load existing articles to avoid duplicates"""
        try:
            with open('articles/index.json', 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _save_articles(self):
        """Save fetched articles to JSON files"""
        # Save individual article files
        for article in self.articles:
            filename = f"articles/{article['id']}.json"
            with open(filename, 'w') as f:
                json.dump(article, f, indent=2)
        
        # Update the index file
        all_articles = self.existing_articles + self.articles
        # Remove duplicates based on URL
        unique_articles = []
        urls = set()
        for article in all_articles:
            if article['url'] not in urls:
                unique_articles.append(article)
                urls.add(article['url'])
        
        # Sort by date (newest first)
        unique_articles.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        with open('articles/index.json', 'w') as f:
            json.dump(unique_articles, f, indent=2)
        
        logger.info(f"Saved {len(self.articles)} new articles. Total: {len(unique_articles)}")
    
    def is_relevant(self, text):
        """Check if text contains VLM-related keywords"""
        text = text.lower()
        for keyword in VLM_KEYWORDS:
            if keyword.lower() in text:
                return True
        return False
    
    def fetch_arxiv_articles(self, max_results=100):
        """Fetch VLM-related articles from arXiv"""
        logger.info("Fetching arXiv articles...")
        
        # Create a search query with our keywords
        search_query = " OR ".join([f'all:"{keyword}"' for keyword in VLM_KEYWORDS])
        
        # Categories to search in
        categories = [
            "cs.CV",  # Computer Vision
            "cs.CL",  # Computational Linguistics
            "cs.AI",  # Artificial Intelligence
            "cs.LG",  # Machine Learning
            "cs.MM"   # Multimedia
        ]
        category_query = " OR ".join([f"cat:{cat}" for cat in categories])
        
        # Combine queries
        full_query = f"({search_query}) AND ({category_query})"
        
        # Set up the API request parameters
        params = {
            "search_query": full_query,
            "sortBy": "submittedDate",
            "sortOrder": "descending",
            "max_results": max_results
        }
        
        response = requests.get(ARXIV_API_URL, params=params)
        
        if response.status_code != 200:
            logger.error(f"arXiv API returned status code {response.status_code}")
            return
        
        # Parse the response using feedparser
        feed = feedparser.parse(response.text)
        
        for entry in feed.entries:
            # Skip if we've seen this article already
            if any(a['url'] == entry.id for a in self.existing_articles):
                continue
            
            # Further verify relevance by checking title and summary
            if not (self.is_relevant(entry.title) or self.is_relevant(entry.summary)):
                continue
            
            # Extract authors
            authors = [author.name for author in entry.authors]
            
            # Format the publication date
            try:
                published = datetime.datetime.strptime(entry.published, "%Y-%m-%dT%H:%M:%SZ").strftime("%Y-%m-%d")
            except (ValueError, KeyError):
                published = datetime.datetime.now().strftime("%Y-%m-%d")
            
            # Create article object
            article = {
                "id": entry.id.split('/')[-1].replace('.', '_'),
                "title": entry.title,
                "url": entry.id,
                "pdf_url": entry.id.replace("abs", "pdf"),
                "authors": authors,
                "date": published,
                "summary": entry.summary,
                "source": "arXiv",
                "categories": [tag['term'] for tag in entry.tags if tag.get('scheme', '').endswith('taxonomy')],
                "keywords": [k for k in VLM_KEYWORDS if k.lower() in (entry.title + entry.summary).lower()]
            }
            
            self.articles.append(article)
            logger.info(f"Found new article: {article['title']}")

    def fetch_google_ai_blog(self):
        """Fetch VLM-related articles from Google AI Blog"""
        logger.info("Fetching Google AI Blog articles...")
        url = "https://blog.research.google/search/label/Machine%20Learning"
        
        try:
            response = requests.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all blog post articles
            articles = soup.find_all('article', class_='post')
            
            for article in articles:
                # Get title and URL
                title_elem = article.find('h1')
                if not title_elem:
                    continue
                    
                title = title_elem.text.strip()
                link_elem = title_elem.find('a')
                if not link_elem:
                    continue
                    
                article_url = link_elem.get('href')
                
                # Skip if not relevant or already exists
                if not self.is_relevant(title):
                    continue
                    
                if any(a['url'] == article_url for a in self.existing_articles):
                    continue
                
                # Get date
                date_elem = article.find('time')
                date = datetime.datetime.now().strftime("%Y-%m-%d")
                if date_elem and date_elem.get('datetime'):
                    try:
                        date = datetime.datetime.strptime(
                            date_elem.get('datetime'), 
                            "%Y-%m-%dT%H:%M:%S%z"
                        ).strftime("%Y-%m-%d")
                    except ValueError:
                        pass
                
                # Get summary
                summary_elem = article.find('div', class_='post-body')
                summary = ""
                if summary_elem:
                    summary = summary_elem.text[:500].strip() + "..."
                
                # Skip if summary isn't relevant
                if not (self.is_relevant(title) or self.is_relevant(summary)):
                    continue
                
                # Create article object
                article_obj = {
                    "id": f"google_ai_{re.sub(r'[^a-zA-Z0-9]', '_', title)[:50]}",
                    "title": title,
                    "url": article_url,
                    "authors": ["Google AI Research"],
                    "date": date,
                    "summary": summary,
                    "source": "Google AI Blog",
                    "keywords": [k for k in VLM_KEYWORDS if k.lower() in (title + summary).lower()]
                }
                
                self.articles.append(article_obj)
                logger.info(f"Found new article: {article_obj['title']}")
                
        except Exception as e:
            logger.error(f"Error fetching Google AI Blog: {str(e)}")

    def fetch_openai_blog(self):
        """Fetch VLM-related articles from OpenAI Blog"""
        logger.info("Fetching OpenAI Blog articles...")
        url = "https://openai.com/blog"
        
        try:
            response = requests.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all blog post articles
            articles = soup.find_all('article')
            
            for article in articles:
                # Get title and URL
                title_elem = article.find('h3')
                if not title_elem:
                    continue
                    
                title = title_elem.text.strip()
                
                link_elem = article.find('a')
                if not link_elem:
                    continue
                    
                article_url = "https://openai.com" + link_elem.get('href')
                
                # Skip if not relevant or already exists
                if not self.is_relevant(title):
                    continue
                    
                if any(a['url'] == article_url for a in self.existing_articles):
                    continue
                
                # Get date (approximate since blog design changes)
                date = datetime.datetime.now().strftime("%Y-%m-%d")
                date_elem = article.find(['time', 'span'], class_=lambda c: c and 'date' in c.lower())
                if date_elem:
                    date_text = date_elem.text.strip()
                    try:
                        date_obj = datetime.datetime.strptime(date_text, "%B %d, %Y")
                        date = date_obj.strftime("%Y-%m-%d")
                    except ValueError:
                        pass
                
                # Get a separate page to extract summary
                try:
                    article_response = requests.get(article_url)
                    article_soup = BeautifulSoup(article_response.text, 'html.parser')
                    summary_elem = article_soup.find(['p', 'div'], class_=lambda c: c and ('summary' in c.lower() or 'excerpt' in c.lower()))
                    
                    summary = ""
                    if summary_elem:
                        summary = summary_elem.text.strip()
                    else:
                        # Try to get the first paragraph
                        first_p = article_soup.find('p')
                        if first_p:
                            summary = first_p.text.strip()
                except Exception:
                    summary = ""
                
                # Skip if summary isn't relevant (unless title is highly relevant)
                if not any(k.lower() in title.lower() for k in VLM_KEYWORDS):
                    if not self.is_relevant(summary):
                        continue
                
                # Create article object
                article_obj = {
                    "id": f"openai_{re.sub(r'[^a-zA-Z0-9]', '_', title)[:50]}",
                    "title": title,
                    "url": article_url,
                    "authors": ["OpenAI"],
                    "date": date,
                    "summary": summary[:500] + "..." if len(summary) > 500 else summary,
                    "source": "OpenAI Blog",
                    "keywords": [k for k in VLM_KEYWORDS if k.lower() in (title + summary).lower()]
                }
                
                self.articles.append(article_obj)
                logger.info(f"Found new article: {article_obj['title']}")
                
        except Exception as e:
            logger.error(f"Error fetching OpenAI Blog: {str(e)}")

    def run(self):
        """Run the article fetcher to get articles from all sources"""
        self.fetch_arxiv_articles()
        self.fetch_google_ai_blog()
        self.fetch_openai_blog()
        
        # Add more sources as needed
        
        # Save all fetched articles
        self._save_articles()
        
        return len(self.articles)


if __name__ == "__main__":
    logger.info("Starting VLM article fetcher")
    fetcher = ArticleFetcher()
    num_articles = fetcher.run()
    logger.info(f"Completed fetching. Found {num_articles} new articles.")