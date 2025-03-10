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
from datetime import datetime as dt
import re
import time
from bs4 import BeautifulSoup
import feedparser
import logging
from urllib.parse import quote_plus
import math
from collections import Counter, defaultdict
import random
import argparse

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
SEMANTIC_SCHOLAR_API_URL = "https://api.semanticscholar.org/graph/v1/paper/search"
VLM_KEYWORDS = [
    "vision language model", "VLM", "multimodal", "vision-language", 
    "image-text", "visual-textual", "CLIP", "DALL-E", "Stable Diffusion",
    "GPT-4V", "vision transformer", "visual BERT", "image captioning",
    "visual question answering", "VQA", "text-to-image", "image-to-text",
    "visual reasoning", "visual grounding", "multimodal alignment",
    "zero-shot vision", "few-shot vision", "multimodal foundation model",
    "multimodal LLM", "visual instruction tuning", "visual understanding",
    "Gemini Pro Vision", "Claude Vision", "Midjourney", "BLIP", "MLLM",
    "text-to-video", "Sora", "ViT", "Segment Anything", "DINO", "DINOv2",
    "visual retrieval", "visual search", "MLLMs", "image generation",
    "visual representation learning", "vision-and-language", "vision+language",
    "semantic image synthesis", "MDETR", "visual segmentation", "Kosmos"
]

class ArticleFetcher:
    def __init__(self, start_date=None, end_date=None):
        self.articles = []
        self.existing_articles = self._load_existing_articles()
        self.keyword_stats = defaultdict(lambda: {
            'count': 0, 
            'mentions_by_month': defaultdict(int),
            'sources': defaultdict(int),
            'attention_score': 0
        })
        
        # Set date range with defaults
        if start_date:
            try:
                self.start_date = dt.strptime(start_date, "%Y-%m-%d")
            except ValueError:
                logger.warning(f"Invalid start_date format: {start_date}. Using default (one year ago).")
                # Default to one year ago from today
                today = dt.now()
                self.start_date = dt(today.year - 1, today.month, today.day)
        else:
            # Default to one year ago from today
            today = dt.now()
            self.start_date = dt(today.year - 1, today.month, today.day)
            
        if end_date:
            try:
                self.end_date = dt.strptime(end_date, "%Y-%m-%d")
            except ValueError:
                logger.warning(f"Invalid end_date format: {end_date}. Using current date.")
                self.end_date = dt.now()
        else:
            # Default to current date
            self.end_date = dt.now()
            
        logger.info(f"Date range set: {self.start_date.strftime('%Y-%m-%d')} to {self.end_date.strftime('%Y-%m-%d')}")
    
    def _load_existing_articles(self):
        """
        Load existing articles from the index.json file.
        
        This ensures we don't duplicate articles and can update attention scores
        for existing articles.
        
        Returns:
            list: The loaded articles
        """
        try:
            if os.path.exists('articles/index.json'):
                with open('articles/index.json', 'r') as f:
                    self.existing_articles = json.load(f)
                    logger.info(f"Loaded {len(self.existing_articles)} existing articles")
            else:
                self.existing_articles = []
                logger.info("No existing articles found")
        except Exception as e:
            logger.error(f"Error loading existing articles: {e}")
            self.existing_articles = []
        
        return self.existing_articles
    
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
        
        # Save to index.json
        with open('articles/index.json', 'w') as f:
            json.dump(unique_articles, f, indent=2)
        
        # Calculate how many new articles we added
        new_article_count = len(self.articles)
        logger.info(f"Saved {new_article_count} new articles. Total: {len(unique_articles)}")
    
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
            "cs.CL",  # Computation and Language
            "cs.AI",  # Artificial Intelligence
            "cs.LG",  # Machine Learning
            "cs.MM",  # Multimedia
        ]
        category_query = " OR ".join([f"cat:{cat}" for cat in categories])
        
        # Add date range based on class parameters
        start_date_str = self.start_date.strftime("%Y%m%d")
        end_date_str = self.end_date.strftime("%Y%m%d")
        date_query = f"submittedDate:[{start_date_str}000000 TO {end_date_str}235959]"
        
        # Combine queries
        full_query = f"({search_query}) AND ({category_query}) AND ({date_query})"
        
        # Set up the API request parameters
        params = {
            "search_query": full_query,
            "start": 0,
            "max_results": max_results,
            "sortBy": "submittedDate",
            "sortOrder": "descending"
        }
        
        # Make the request to arXiv API
        response = requests.get(ARXIV_API_URL, params=params)
        
        if response.status_code != 200:
            logger.error(f"arXiv API returned status code {response.status_code}")
            return
        
        # Parse the response using feedparser
        feed = feedparser.parse(response.text)
        logger.info(f"arXiv returned {len(feed.entries)} entries")
        
        # Process each entry
        for entry in feed.entries:
            # Skip if not relevant
            if not (self.is_relevant(entry.title) or self.is_relevant(entry.summary)):
                continue
            
            # Extract authors
            authors = [author.name for author in entry.authors]
            
            # Format the publication date
            try:
                published = dt.strptime(entry.published, "%Y-%m-%dT%H:%M:%SZ").strftime("%Y-%m-%d")
            except (ValueError, KeyError):
                published = self.get_current_date().strftime("%Y-%m-%d")
            
            # Create article object
            article = {
                "id": entry.id.split("/")[-1],
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
                date = dt.now().strftime("%Y-%m-%d")
                if date_elem and date_elem.get('datetime'):
                    try:
                        date = dt.strptime(
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
            logger.info(f"Sending request to: {url}")
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml",
                "Accept-Language": "en-US,en;q=0.9"
            }
            response = requests.get(url, headers=headers, timeout=15)
            logger.info(f"OpenAI Blog response status: {response.status_code}")
            
            # Try using their API url instead if we get blocked
            if response.status_code == 403:
                logger.info("Trying OpenAI Blog RSS feed instead...")
                rss_url = "https://openai.com/index.xml"
                response = requests.get(rss_url, headers=headers, timeout=15)
                logger.info(f"OpenAI RSS feed response status: {response.status_code}")
                
                if response.status_code == 200:
                    # Parse RSS feed
                    feed = feedparser.parse(response.text)
                    logger.info(f"Found {len(feed.entries)} entries in the OpenAI RSS feed")
                    
                    for entry in feed.entries:
                        title = entry.title
                        article_url = entry.link
                        
                        # Skip if not relevant or already exists
                        if not self.is_relevant(title):
                            continue
                            
                        if any(a['url'] == article_url for a in self.existing_articles):
                            continue
                        
                        # Get date
                        date = dt.now().strftime("%Y-%m-%d")
                        if hasattr(entry, 'published'):
                            try:
                                date_obj = dt.strptime(entry.published, "%a, %d %b %Y %H:%M:%S %z")
                                date = date_obj.strftime("%Y-%m-%d")
                            except (ValueError, AttributeError):
                                pass
                        
                        # Get summary
                        summary = ""
                        if hasattr(entry, 'summary'):
                            summary = entry.summary
                        
                        # Create article object
                        article_id = f"openai_{re.sub(r'[^a-zA-Z0-9]', '_', title)[:50]}"
                        article_obj = {
                            "id": article_id,
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
                    
                    return
            
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all blog post articles
            articles = soup.find_all('article')
            logger.info(f"Found {len(articles)} articles on OpenAI Blog")
            
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
                date = dt.now().strftime("%Y-%m-%d")
                date_elem = article.find(['time', 'span'], class_=lambda c: c and 'date' in c.lower())
                if date_elem:
                    date_text = date_elem.text.strip()
                    try:
                        date_obj = dt.strptime(date_text, "%B %d, %Y")
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

    def fetch_meta_ai_blog(self):
        """Fetch VLM-related articles from Meta AI Research Blog"""
        logger.info("Fetching Meta AI Research Blog articles...")
        url = "https://ai.meta.com/blog/"
        
        try:
            logger.info(f"Sending request to: {url}")
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml",
                "Accept-Language": "en-US,en;q=0.9"
            }
            response = requests.get(url, headers=headers, timeout=15)
            logger.info(f"Meta AI Blog response status: {response.status_code}")
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all blog post entries
            blog_posts = soup.find_all('div', class_='blog-post-card')
            logger.info(f"Found {len(blog_posts)} blog posts on Meta AI Blog")
            
            for post in blog_posts:
                # Get title
                title_elem = post.find('h2')
                if not title_elem:
                    continue
                
                title = title_elem.text.strip()
                
                # Get link
                link_elem = post.find('a')
                if not link_elem:
                    continue
                
                article_url = "https://ai.meta.com" + link_elem.get('href')
                
                # Skip if not relevant or already exists
                if not self.is_relevant(title):
                    continue
                    
                if any(a['url'] == article_url for a in self.existing_articles):
                    continue
                
                # Extract date if available
                date_elem = post.find('span', class_='blog-post-card__date')
                date = dt.now().strftime("%Y-%m-%d")
                if date_elem:
                    date_text = date_elem.text.strip()
                    try:
                        # Example date format: "May 16, 2023"
                        date_obj = dt.strptime(date_text, "%B %d, %Y")
                        date = date_obj.strftime("%Y-%m-%d")
                    except ValueError:
                        # If date format is different, keep current date
                        pass
                
                # Get post details from article page
                try:
                    article_response = requests.get(article_url, headers={"User-Agent": "Mozilla/5.0"})
                    article_soup = BeautifulSoup(article_response.text, 'html.parser')
                    
                    # Get summary
                    summary_elem = article_soup.find('meta', property='og:description')
                    summary = ""
                    if summary_elem and summary_elem.get('content'):
                        summary = summary_elem.get('content')
                    else:
                        # Try to get first paragraph
                        first_p = article_soup.find('div', class_='prose').find('p')
                        if first_p:
                            summary = first_p.text.strip()
                    
                    # Get authors
                    authors = []
                    author_elems = article_soup.find_all('span', class_='blog-post-authors__author-name')
                    for author_elem in author_elems:
                        authors.append(author_elem.text.strip())
                    
                    if not authors:
                        authors = ["Meta AI Research"]
                    
                    # Skip if summary isn't relevant (unless title is highly relevant)
                    if not any(k.lower() in title.lower() for k in VLM_KEYWORDS):
                        if not self.is_relevant(summary):
                            continue
                    
                    # Create article object
                    article_id = f"meta_ai_{re.sub(r'[^a-zA-Z0-9]', '_', title)[:50]}"
                    article_obj = {
                        "id": article_id,
                        "title": title,
                        "url": article_url,
                        "authors": authors,
                        "date": date,
                        "summary": summary[:500] + "..." if len(summary) > 500 else summary,
                        "source": "Meta AI Research",
                        "keywords": [k for k in VLM_KEYWORDS if k.lower() in (title + summary).lower()]
                    }
                    
                    self.articles.append(article_obj)
                    logger.info(f"Found new article: {article_obj['title']}")
                    
                except Exception as e:
                    logger.error(f"Error processing Meta AI article {article_url}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error fetching Meta AI Blog: {str(e)}")
    
    def fetch_microsoft_research_blog(self):
        """Fetch VLM-related articles from Microsoft Research Blog"""
        logger.info("Fetching Microsoft Research Blog articles...")
        url = "https://www.microsoft.com/en-us/research/blog/"
        
        try:
            logger.info(f"Sending request to: {url}")
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml",
                "Accept-Language": "en-US,en;q=0.9"
            }
            response = requests.get(url, headers=headers, timeout=15)
            logger.info(f"Microsoft Research Blog response status: {response.status_code}")
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all article cards
            article_cards = soup.find_all('div', class_='card')
            logger.info(f"Found {len(article_cards)} article cards on Microsoft Research Blog")
            
            for card in article_cards:
                # Get title and URL
                title_elem = card.find('h3')
                if not title_elem:
                    continue
                
                title = title_elem.text.strip()
                
                link_elem = card.find('a')
                if not link_elem:
                    continue
                
                article_url = link_elem.get('href')
                if not article_url.startswith('http'):
                    article_url = "https://www.microsoft.com" + article_url
                
                # Skip if not relevant or already exists
                if not self.is_relevant(title):
                    continue
                    
                if any(a['url'] == article_url for a in self.existing_articles):
                    continue
                
                # Get date
                date_elem = card.find('div', class_='date')
                date = dt.now().strftime("%Y-%m-%d")
                if date_elem:
                    date_text = date_elem.text.strip()
                    try:
                        # Example format: "April 25, 2023"
                        date_obj = dt.strptime(date_text, "%B %d, %Y")
                        date = date_obj.strftime("%Y-%m-%d")
                    except ValueError:
                        pass
                
                # Get more details from the article page
                try:
                    article_response = requests.get(article_url, headers={"User-Agent": "Mozilla/5.0"})
                    article_soup = BeautifulSoup(article_response.text, 'html.parser')
                    
                    # Get summary
                    summary_elem = article_soup.find('meta', property='og:description')
                    summary = ""
                    if summary_elem and summary_elem.get('content'):
                        summary = summary_elem.get('content')
                    else:
                        # Try to get first paragraph
                        first_p = article_soup.find('div', class_='content').find('p')
                        if first_p:
                            summary = first_p.text.strip()
                    
                    # Get authors
                    authors = []
                    author_elems = article_soup.find_all('div', class_='author-name')
                    for author_elem in author_elems:
                        authors.append(author_elem.text.strip())
                    
                    if not authors:
                        authors = ["Microsoft Research"]
                    
                    # Skip if summary isn't relevant (unless title is highly relevant)
                    if not any(k.lower() in title.lower() for k in VLM_KEYWORDS):
                        if not self.is_relevant(summary):
                            continue
                    
                    # Create article object
                    article_id = f"ms_research_{re.sub(r'[^a-zA-Z0-9]', '_', title)[:50]}"
                    article_obj = {
                        "id": article_id,
                        "title": title,
                        "url": article_url,
                        "authors": authors,
                        "date": date,
                        "summary": summary[:500] + "..." if len(summary) > 500 else summary,
                        "source": "Microsoft Research",
                        "keywords": [k for k in VLM_KEYWORDS if k.lower() in (title + summary).lower()]
                    }
                    
                    self.articles.append(article_obj)
                    logger.info(f"Found new article: {article_obj['title']}")
                    
                except Exception as e:
                    logger.error(f"Error processing Microsoft Research article {article_url}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error fetching Microsoft Research Blog: {str(e)}")
    
    def fetch_huggingface_blog(self):
        """Fetch VLM-related articles from HuggingFace Blog"""
        logger.info("Fetching HuggingFace Blog articles...")
        url = "https://huggingface.co/blog"
        
        try:
            logger.info(f"Sending request to: {url}")
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml",
                "Accept-Language": "en-US,en;q=0.9"
            }
            response = requests.get(url, headers=headers, timeout=15)
            logger.info(f"HuggingFace Blog response status: {response.status_code}")
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all blog post cards
            blog_cards = soup.find_all('a', class_='blog-post-card')
            logger.info(f"Found {len(blog_cards)} blog cards on HuggingFace Blog")
            
            for card in blog_cards:
                # Get title
                title_elem = card.find('h3')
                if not title_elem:
                    continue
                
                title = title_elem.text.strip()
                
                # Get URL
                article_url = "https://huggingface.co" + card.get('href')
                
                # Skip if not relevant or already exists
                if not self.is_relevant(title):
                    continue
                    
                if any(a['url'] == article_url for a in self.existing_articles):
                    continue
                
                # Get date
                date_elem = card.find('div', class_='blog-post-card-date')
                date = dt.now().strftime("%Y-%m-%d")
                if date_elem:
                    date_text = date_elem.text.strip()
                    try:
                        # Example format: "Jun 7, 2023"
                        date_obj = dt.strptime(date_text, "%b %d, %Y")
                        date = date_obj.strftime("%Y-%m-%d")
                    except ValueError:
                        pass
                
                # Get summary from the card if available
                summary_elem = card.find('div', class_='blog-post-card-summary')
                summary = ""
                if summary_elem:
                    summary = summary_elem.text.strip()
                
                if not summary:
                    # Try to get more details from the article page
                    try:
                        article_response = requests.get(article_url, headers={"User-Agent": "Mozilla/5.0"})
                        article_soup = BeautifulSoup(article_response.text, 'html.parser')
                        
                        # Try to get summary from meta description
                        summary_meta = article_soup.find('meta', {'name': 'description'})
                        if summary_meta:
                            summary = summary_meta.get('content', '')
                        
                        if not summary:
                            # Try to get first paragraph
                            first_p = article_soup.find('div', class_='post-content').find('p')
                            if first_p:
                                summary = first_p.text.strip()
                        
                        # Try to get authors
                        authors = []
                        author_elem = article_soup.find('div', class_='post-author')
                        if author_elem:
                            authors = [author_elem.text.strip()]
                    except Exception as e:
                        logger.error(f"Error processing HuggingFace article page {article_url}: {str(e)}")
                        authors = ["HuggingFace"]
                else:
                    authors = ["HuggingFace"]
                
                # Skip if summary isn't relevant (unless title is highly relevant)
                if not any(k.lower() in title.lower() for k in VLM_KEYWORDS):
                    if not self.is_relevant(summary):
                        continue
                
                # Create article object
                article_id = f"huggingface_{re.sub(r'[^a-zA-Z0-9]', '_', title)[:50]}"
                article_obj = {
                    "id": article_id,
                    "title": title,
                    "url": article_url,
                    "authors": authors,
                    "date": date,
                    "summary": summary[:500] + "..." if len(summary) > 500 else summary,
                    "source": "HuggingFace Blog",
                    "keywords": [k for k in VLM_KEYWORDS if k.lower() in (title + summary).lower()]
                }
                
                self.articles.append(article_obj)
                logger.info(f"Found new article: {article_obj['title']}")
                
        except Exception as e:
            logger.error(f"Error fetching HuggingFace Blog: {str(e)}")
    
    def fetch_paperswithcode(self):
        """Fetch VLM-related articles from Papers With Code"""
        logger.info("Fetching Papers With Code articles...")
        
        # Keep track of URLs we've already found to avoid duplicates across keywords
        found_urls = set()
        
        # Search for multiple keywords
        for keyword in ["vision-language", "multimodal", "VLM"]:
            try:
                url = f"https://paperswithcode.com/search?q={keyword}"
                logger.info(f"Searching Papers With Code for keyword: {keyword}")
                logger.info(f"Sending request to: {url}")
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml",
                    "Accept-Language": "en-US,en;q=0.9"
                }
                response = requests.get(url, headers=headers, timeout=15)
                logger.info(f"Papers With Code response status for '{keyword}': {response.status_code}")
                response.raise_for_status()
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Find all paper cards
                paper_items = soup.find_all('div', class_='paper-card')
                logger.info(f"Found {len(paper_items)} paper cards for keyword '{keyword}'")
                
                for item in paper_items:
                    # Get title and URL
                    title_link = item.find('h1').find('a')
                    if not title_link:
                        continue
                    
                    title = title_link.text.strip()
                    paper_url = "https://paperswithcode.com" + title_link.get('href')
                    
                    # Skip if already found with another keyword
                    if paper_url in found_urls:
                        logger.info(f"Skipping duplicate paper: {title}")
                        continue
                    
                    # Skip if already exists in our database
                    if any(a['url'] == paper_url for a in self.existing_articles):
                        logger.info(f"Skipping existing paper: {title}")
                        continue
                    
                    # Get abstract
                    abstract_elem = item.find('p', class_='item-strip-abstract')
                    summary = ""
                    if abstract_elem:
                        summary = abstract_elem.text.strip()
                    
                    # Skip if not relevant
                    if not (self.is_relevant(title) or self.is_relevant(summary)):
                        logger.info(f"Skipping irrelevant paper: {title}")
                        continue
                    
                    # Get date - for Papers with Code, we'll use the current date as it's hard to get publication date
                    date = self.get_current_date().strftime("%Y-%m-%d")
                    
                    # Get authors
                    authors = []
                    author_elems = item.find_all('a', class_='author-name')
                    for author_elem in author_elems:
                        authors.append(author_elem.text.strip())
                    
                    # Get paper code link if available
                    code_link = None
                    code_elem = item.find('a', class_='code-table-link')
                    if code_elem:
                        code_link = "https://paperswithcode.com" + code_elem.get('href')
                    
                    # Create article object
                    article_id = f"paperswithcode_{re.sub(r'[^a-zA-Z0-9]', '_', title)[:50]}"
                    article_obj = {
                        "id": article_id,
                        "title": title,
                        "url": paper_url,
                        "authors": authors,
                        "date": date,
                        "summary": summary[:500] + "..." if len(summary) > 500 else summary,
                        "source": "Papers With Code",
                        "keywords": [k for k in VLM_KEYWORDS if k.lower() in (title + summary).lower()],
                        "code_url": code_link
                    }
                    
                    self.articles.append(article_obj)
                    logger.info(f"Found new article: {article_obj['title']}")
                
            except Exception as e:
                logger.error(f"Error fetching Papers With Code for keyword '{keyword}': {str(e)}", exc_info=True)
                continue
    
    def fetch_semantic_scholar_conferences(self):
        """Fetch conference papers via Semantic Scholar API"""
        logger.info("Fetching conference papers via Semantic Scholar API...")
        
        # Define conference venues to search
        venues = [
            "CVPR", "ICCV", "ECCV",  # Computer Vision
            "NeurIPS", "ICML", "ICLR",  # Machine Learning
            "ACL", "NAACL", "EMNLP",  # NLP
            "AAAI", "IJCAI"  # AI
        ]
        
        successful_venues = 0
        current_date = dt.now()
        current_year = current_date.year
        
        # Search for papers from the last 2 years
        year_range = f"{current_year-2}-{current_year}"
        
        # Add your Semantic Scholar API key here (get one from https://www.semanticscholar.org/product/api)
        # If you don't have an API key, you'll be limited to 100 requests per day
        api_key = ""  # Replace with your API key
        
        # Process each conference venue separately for better results
        for venue in venues:
            logger.info(f"Searching for papers in {venue}...")
            
            # Retry mechanism with exponential backoff
            max_retries = 5
            base_wait = 2  # seconds
            
            for attempt in range(max_retries):
                try:
                    params = {
                        "query": f"venue:{venue} AND (vision language model OR VLM OR CLIP OR multimodal OR vision-language)",
                        "limit": 25,  # Reduced from 50 to avoid rate limiting
                        "fields": "title,authors,venue,year,abstract,url,citationCount",
                        "year": year_range
                    }
                    
                    headers = {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    }
                    
                    # Add API key to headers if available
                    if api_key:
                        headers["x-api-key"] = api_key
                    
                    response = requests.get(SEMANTIC_SCHOLAR_API_URL, params=params, headers=headers)
                    status_code = response.status_code
                    logger.info(f"Semantic Scholar API response status for {venue}: {status_code}")
                    
                    # Handle rate limiting with exponential backoff
                    if status_code == 429:
                        if attempt < max_retries:
                            wait_time = base_wait * (2 ** attempt) + random.uniform(1, 5)  # Add randomness
                            logger.warning(f"Rate limited. Waiting {wait_time:.2f}s before retry...")
                            time.sleep(wait_time)
                            continue
                        else:
                            logger.error(f"Max retries exceeded for {venue}. Skipping.")
                            break
                    
                    if status_code == 200:
                        data = response.json()
                        
                        if "data" in data:
                            papers = data["data"]
                            logger.info(f"Found {len(papers)} papers for venue '{venue}'")
                            
                            papers_added = 0
                            for paper in papers:
                                # Extract title
                                title = paper.get("title", "")
                                if not title:
                                    continue
                                
                                # Skip if already exists
                                paper_url = paper.get("url") or f"https://api.semanticscholar.org/paper/{paper.get('paperId')}"
                                if any(a['url'] == paper_url for a in self.existing_articles):
                                    logger.info(f"Skipping existing paper: {title}")
                                    continue
                                
                                # Skip if not relevant (double check)
                                if not self.is_relevant(title) and (not paper.get("abstract") or not self.is_relevant(paper["abstract"])):
                                    logger.info(f"Skipping irrelevant paper: {title}")
                                    continue
                                
                                # Get authors
                                authors = []
                                if "authors" in paper:
                                    authors = [author.get("name", "") for author in paper["authors"] if author.get("name")]
                                
                                # Get venue and year
                                year = paper.get("year", current_year)
                                if not year:
                                    year = current_year
                                
                                # Create a date (publications are usually distributed throughout the year)
                                # Using a random month for better visualization
                                date = ""
                                if year == current_year:
                                    # Last 3 months for current year papers
                                    month = max(1, current_date.month - random.randint(0, 2))
                                    date = f"{year}-{month:02d}-01"
                                else:
                                    # Random month from last year
                                    month = random.randint(1, 12)
                                    date = f"{year}-{month:02d}-01"
                                
                                # Get abstract
                                summary = paper.get("abstract", f"Conference paper from {venue}")
                                
                                # Create a unique ID
                                paper_id = paper.get("paperId", "")
                                if paper_id:
                                    article_id = f"semantic_scholar_{paper_id}"
                                else:
                                    article_id = f"conf_{re.sub(r'[^a-zA-Z0-9]', '_', title)[:50]}"
                                
                                # Extract keywords from title and abstract
                                content = title + " " + summary
                                keywords = [k for k in VLM_KEYWORDS if k.lower() in content.lower()]
                                
                                # Create article object
                                article_obj = {
                                    "id": article_id,
                                    "title": title,
                                    "url": paper_url,
                                    "authors": authors,
                                    "date": date,
                                    "summary": summary[:500] + "..." if len(summary) > 500 else summary,
                                    "source": f"{venue} Conference",
                                    "citation_count": paper.get("citationCount", 0),
                                    "keywords": keywords
                                }
                                
                                self.articles.append(article_obj)
                                papers_added += 1
                                logger.info(f"Found new conference paper: {title}")
                            
                            logger.info(f"Added {papers_added} papers from {venue}")
                            if papers_added > 0:
                                successful_venues += 1
                        else:
                            logger.warning(f"No data found in Semantic Scholar response for '{venue}'")
                        
                        # Successfully processed this venue, break out of retry loop
                        break
                    else:
                        logger.error(f"Error from Semantic Scholar API: {status_code}")
                        break
                        
                except Exception as e:
                    logger.error(f"Error fetching from Semantic Scholar for '{venue}': {str(e)}", exc_info=True)
                    if attempt < max_retries:
                        wait_time = base_wait * (2 ** attempt)
                        logger.warning(f"Error occurred. Waiting {wait_time}s before retry...")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"Max retries exceeded for {venue}. Skipping.")
                
            # Always be nice to the API between venues - increased wait time
            time.sleep(5)  # Increased from 2 seconds
        
        logger.info(f"Successfully fetched papers from {successful_venues} out of {len(venues)} conference venues")
    
    def calculate_keyword_statistics(self):
        """Calculate statistics and attention scores for keywords"""
        logger.info("Calculating keyword statistics...")
        
        # Initialize keyword statistics dictionary
        self.keyword_stats = defaultdict(lambda: {
            'count': 0,
            'attention_score': 0,
            'mentions_by_month': defaultdict(int),
            'sources': defaultdict(int)
        })
        
        # Get current date for recency calculations
        current_date = self.get_current_date()
        current_year_month = f"{current_date.year}-{current_date.month:02d}"
        
        # Calculate statistics for each article
        for article in self.articles:
            # Skip articles without keywords
            if not article.get('keywords'):
                continue
            
            try:
                # Parse the article date
                article_date = dt.strptime(article['date'], "%Y-%m-%d")
                year_month = f"{article_date.year}-{article_date.month:02d}"
                
                # Calculate recency factor (1.0 for current month, decreasing for older articles)
                months_ago = self._months_between(year_month, current_year_month)
                recency_factor = math.exp(-0.1 * months_ago)  # Exponential decay
                
                # Get article source
                source = article.get('source', 'Unknown')
                
                # Default citation weight
                citation_weight = 1.0
                if 'citation_count' in article:
                    # Log scale to dampen effect of very high citation counts
                    citation_weight = 1.0 + math.log(article['citation_count'] + 1)
                
                # Update stats for each keyword
                for keyword in article.get('keywords', []):
                    self.keyword_stats[keyword]['count'] += 1
                    self.keyword_stats[keyword]['mentions_by_month'][year_month] += 1
                    self.keyword_stats[keyword]['sources'][source] += 1
                    
                    # Add weighted contribution to attention score
                    self.keyword_stats[keyword]['attention_score'] += recency_factor * citation_weight
            
            except (ValueError, TypeError):
                # Skip articles with invalid dates
                logger.warning(f"Skipping article with invalid date: {article.get('title')}")
                continue
        
        # Calculate trend factors (growth over time)
        for keyword, stats in self.keyword_stats.items():
            if len(stats['mentions_by_month']) >= 6:  # Need at least 6 months of data
                # Get months in sorted order
                months = sorted(stats['mentions_by_month'].keys())
                
                if len(months) >= 6:
                    # Calculate average mentions in recent 3 months vs. older months
                    recent_months = months[-3:]  # Most recent 3 months
                    older_months = months[:-3]   # Earlier months
                    
                    recent_avg = sum(stats['mentions_by_month'][m] for m in recent_months) / len(recent_months)
                    older_avg = sum(stats['mentions_by_month'][m] for m in older_months) / len(older_months)
                    
                    # Calculate growth factor
                    if older_avg > 0:
                        growth_factor = recent_avg / older_avg
                        # Apply growth bonus to attention score
                        stats['attention_score'] *= min(3.0, growth_factor)  # Cap at 3x boost
        
        # Log top keywords by attention score
        top_keywords = sorted(self.keyword_stats.items(), key=lambda x: x[1]['attention_score'], reverse=True)
        logger.info("Top keywords by attention score:")
        for keyword, stats in top_keywords[:10]:  # Top 10
            logger.info(f"  {keyword}: score={stats['attention_score']:.2f}, count={stats['count']}")
        
        # Save keyword stats to a JSON file
        self._save_keyword_stats()
    
    def calculate_paper_attention_scores(self):
        """
        Calculate attention scores for papers based on various factors.
        
        The attention score is a weighted combination of:
        - Citation count (normalized)
        - Recency (more recent papers get higher scores)
        - Citation velocity (citations per month since publication)
        - Source prestige (e.g., top conferences get higher weights)
        - Keyword relevance
        """
        logger.info("Calculating paper attention scores...")
        
        # Load existing articles if not already loaded
        if not self.existing_articles:
            self._load_existing_articles()
        
        # Combine existing and new articles for scoring
        all_articles = self.existing_articles + self.articles
        
        # Get current date for recency calculation
        current_date = self.get_current_date()
        
        # Calculate scores for each article
        for article in all_articles:
            # Initialize components dictionary if it doesn't exist
            if 'attention_components' not in article:
                article['attention_components'] = {}
            
            # Get citation count (default to 0 if not available)
            citation_count = article.get('citation_count', 0)
            
            # Calculate recency score
            recency_score = 0
            try:
                if 'date' in article and article['date']:
                    # Try different date formats
                    try:
                        # Try YYYY-MM-DD format first (most common in our data)
                        pub_date = dt.strptime(article['date'], '%Y-%m-%d')
                    except ValueError:
                        try:
                            # Try Month Day, Year format
                            pub_date = dt.strptime(article['date'], '%B %d, %Y')
                        except ValueError:
                            # Default to today if we can't parse the date
                            pub_date = current_date
                    
                    months_since_pub = (
                        (current_date.year - pub_date.year) * 12 + 
                        (current_date.month - pub_date.month)
                    )
                    
                    # More recent papers get higher scores
                    if months_since_pub <= 0:  # Future papers (should be rare)
                        recency_score = 1.0
                    elif months_since_pub <= 24:
                        recency_score = 1.0 - (months_since_pub / 24)
                    else:
                        recency_score = 0.2  # Base score for older papers
                else:
                    recency_score = 0.5  # Default for papers without dates
            except Exception as e:
                logger.error(
                    f"Error calculating recency for {article.get('title', 'Unknown')}: {e}"
                )
                recency_score = 0.5  # Default on error
            
            # Calculate citation velocity (citations per month)
            citation_velocity = 0
            try:
                if 'date' in article and article['date'] and citation_count > 0:
                    # Try different date formats (same as above)
                    try:
                        pub_date = dt.strptime(article['date'], '%Y-%m-%d')
                    except ValueError:
                        try:
                            pub_date = dt.strptime(article['date'], '%B %d, %Y')
                        except ValueError:
                            pub_date = current_date
                    
                    months_since_pub = max(
                        1, 
                        (current_date.year - pub_date.year) * 12 + 
                        (current_date.month - pub_date.month)
                    )
                    citation_velocity = citation_count / months_since_pub
                else:
                    citation_velocity = 0
            except Exception as e:
                logger.error(
                    f"Error calculating citation velocity for "
                    f"{article.get('title', 'Unknown')}: {e}"
                )
                citation_velocity = 0
            
            # Source weight based on prestige
            source_weight = 1.0  # Default weight
            source = article.get('source', '').lower()
            
            # Assign weights to different sources
            if 'arxiv' in source:
                source_weight = 0.7  # ArXiv papers (not peer-reviewed)
            elif any(conf in source for conf in 
                    ['cvpr', 'iccv', 'eccv', 'neurips', 'icml', 'iclr']):
                source_weight = 1.5  # Top-tier conferences
            elif any(conf in source for conf in 
                    ['acl', 'naacl', 'emnlp', 'aaai', 'ijcai']):
                source_weight = 1.3  # Good conferences
            elif 'journal' in source or 'transactions' in source:
                source_weight = 1.2  # Journal papers
            elif 'papers with code' in source:
                source_weight = 1.1  # Papers With Code
            elif any(blog in source for blog in ['google ai', 'openai', 'meta ai', 'microsoft']):
                source_weight = 1.2  # Industry research blogs
            
            # Keyword relevance score
            keyword_count = len(article.get('keywords', []))
            keyword_score = min(1.0, keyword_count / 5)  # Cap at 1.0
            
            # Calculate base score
            # Normalize citation count (log scale)
            citation_score = math.log(citation_count + 1) / 10
            
            # Combine factors with weights
            base_score = (
                (citation_score * 3.0) +    # Citation count
                (recency_score * 3.0) +     # Recency (weighted high)
                (citation_velocity * 1.5) + # Citation velocity
                (source_weight * 1.5) +     # Source prestige
                (keyword_score * 2.0)       # Keyword relevance (weighted high)
            )
            
            # Store components for transparency
            article['attention_components'] = {
                'citation_score': round(citation_score, 2),
                'recency_score': round(recency_score, 2),
                'citation_velocity': round(citation_velocity, 2),
                'source_weight': round(source_weight, 2),
                'keyword_score': round(keyword_score, 2),
                'base_score': round(base_score, 2)
            }
            
            # Final attention score (rounded to 2 decimal places)
            article['attention_score'] = round(base_score, 2)
        
        # Save top papers by attention score to a separate file
        self._save_paper_attention_scores(all_articles)
        
        print("Paper attention scores calculated successfully")
    
    def _save_paper_attention_scores(self, articles_with_scores):
        """
        Save the top papers by attention score to a separate file.
        
        Args:
            articles_with_scores: List of articles with attention scores
        """
        # Sort by attention score (highest first)
        sorted_articles = sorted(
            articles_with_scores,
            key=lambda x: x.get('attention_score', 0),
            reverse=True
        )
        
        # Extract relevant information for the attention score file
        paper_attention = []
        for article in sorted_articles:
            # Include all articles with any attention score (not just >0)
            paper_attention.append({
                'id': article.get('id', ''),
                'title': article.get('title', ''),
                'url': article.get('url', ''),
                'date': article.get('date', ''),
                'attention_score': article.get('attention_score', 0),
                'attention_components': article.get('attention_components', {})
            })
            
            # Limit to top 100 papers to keep the file manageable
            if len(paper_attention) >= 100:
                break
        
        # Save to paper_attention.json
        with open('articles/paper_attention.json', 'w') as f:
            json.dump(paper_attention, f, indent=2)
        
        logger.info(f"Saved {len(paper_attention)} papers with attention scores")
    
    def _save_keyword_stats(self):
        """Save keyword statistics to a JSON file"""
        # Convert defaultdict to regular dict for JSON serialization
        keyword_stats_dict = {k: dict(v) for k, v in self.keyword_stats.items()}
        
        # Save to file
        try:
            with open('articles/keyword_stats.json', 'w') as f:
                json.dump({
                    'keywords': keyword_stats_dict,
                    'updated_at': self.get_current_date().strftime("%Y-%m-%d %H:%M:%S")
                }, f, indent=2)
            logger.info("Saved keyword statistics to articles/keyword_stats.json")
        except Exception as e:
            logger.error(f"Error saving keyword stats: {str(e)}")
    
    def _months_between(self, ym1, ym2):
        """Calculate months between two year-month strings (format: YYYY-MM)"""
        y1, m1 = map(int, ym1.split('-'))
        y2, m2 = map(int, ym2.split('-'))
        return (y2 - y1) * 12 + (m2 - m1)
    
    def get_current_date(self):
        """
        Get the current date.
        This ensures consistent date handling throughout the application.
        
        Returns:
            datetime: The current date
        """
        return dt.now()
    
    def run(self):
        """Run the article fetcher to collect articles from all sources"""
        logger.info("Starting VLM article fetcher")
        
        # Clear existing articles to prevent duplication
        self.articles = []
        
        # Load existing articles
        self.existing_articles = self._load_existing_articles()
        logger.info(f"Loaded {len(self.existing_articles)} existing articles")
        
        # Fetch articles from various sources
        self.fetch_arxiv_articles()
        self.fetch_google_ai_blog()
        self.fetch_openai_blog()
        self.fetch_meta_ai_blog()
        self.fetch_microsoft_research_blog()
        self.fetch_huggingface_blog()
        self.fetch_paperswithcode()
        self.fetch_semantic_scholar_conferences()
        
        # Save the articles
        self._save_articles()
        
        # Calculate keyword statistics
        self.calculate_keyword_statistics()
        
        # Calculate paper attention scores
        self.calculate_paper_attention_scores()
        
        logger.info(f"Completed fetching. Found {len(self.articles)} new articles.")
        return len(self.articles)


if __name__ == "__main__":
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description='Fetch VLM-related articles')
    parser.add_argument('--start-date', type=str, 
                        help='Start date in YYYY-MM-DD format (default: one year ago)')
    parser.add_argument('--end-date', type=str, 
                        help='End date in YYYY-MM-DD format (default: current date)')
    
    args = parser.parse_args()
    
    # Create and run the article fetcher with specified date range
    fetcher = ArticleFetcher(start_date=args.start_date, end_date=args.end_date)
    fetcher.run()
