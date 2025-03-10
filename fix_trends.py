#!/usr/bin/env python3
"""
Fix trends and paper attention scores based on corrected dates
"""

import json
import datetime
import math
import os
from collections import defaultdict

def fix_trends():
    print("Fixing trends and paper attention scores...")
    
    # Load the index file
    with open('articles/index.json', 'r') as f:
        articles = json.load(f)
    
    # Get current date for recency calculations
    current_date = datetime.datetime.now()
    current_year = 2024  # Hardcoded to 2024
    current_month = current_date.month
    current_year_month = f"{current_year}-{current_month:02d}"
    
    # Reset keyword stats
    keyword_stats = defaultdict(lambda: {
        'count': 0,
        'mentions_by_month': defaultdict(int),
        'sources': defaultdict(int),
        'attention_score': 0
    })
    
    # Count occurrences and gather statistics
    for article in articles:
        # Skip articles without proper dates
        if not article.get('date'):
            continue
            
        try:
            # Parse the article date
            article_date = datetime.datetime.strptime(article['date'], "%Y-%m-%d")
            year_month = f"{article_date.year}-{article_date.month:02d}"
            
            # Calculate recency factor (1.0 for current month, decreasing for older articles)
            months_ago = months_between(year_month, current_year_month)
            recency_factor = math.exp(-0.1 * months_ago)  # Exponential decay
            
            # Get article source
            source = article.get('source', 'Unknown')
            
            # Calculate citation weight (if available)
            citation_weight = 1.0
            if 'citation_count' in article:
                # Log scale to dampen effect of very high citation counts
                citation_weight = 1.0 + math.log(article['citation_count'] + 1)
            
            # Update stats for each keyword
            for keyword in article.get('keywords', []):
                keyword_stats[keyword]['count'] += 1
                keyword_stats[keyword]['mentions_by_month'][year_month] += 1
                keyword_stats[keyword]['sources'][source] += 1
                
                # Add weighted contribution to attention score
                keyword_stats[keyword]['attention_score'] += recency_factor * citation_weight
        
        except (ValueError, TypeError) as e:
            # Skip articles with invalid dates
            print(f"Skipping article with invalid date: {article.get('title')}")
            continue
    
    # Calculate trend factors (growth over time)
    for keyword, stats in keyword_stats.items():
        if len(stats['mentions_by_month']) > 1:
            # Get sorted months
            months = sorted(stats['mentions_by_month'].keys())
            
            if len(months) > 6:  # If we have at least 6 months of data
                # Compare recent months to older months
                recent_months = months[-3:]  # Last 3 months
                older_months = months[:-3]   # Earlier months
                
                recent_avg = sum(stats['mentions_by_month'][m] for m in recent_months) / len(recent_months)
                older_avg = sum(stats['mentions_by_month'][m] for m in older_months) / len(older_months)
                
                # Calculate growth factor
                if older_avg > 0:
                    growth_factor = recent_avg / older_avg
                    # Apply growth bonus to attention score
                    stats['attention_score'] *= min(3.0, growth_factor)  # Cap at 3x boost
    
    # Log top keywords by attention score
    top_keywords = sorted(keyword_stats.items(), key=lambda x: x[1]['attention_score'], reverse=True)
    print("Top keywords by attention score:")
    for keyword, stats in top_keywords[:10]:  # Top 10
        print(f"  {keyword}: score={stats['attention_score']:.2f}, count={stats['count']}")
    
    # Save keyword stats to a JSON file
    save_keyword_stats(keyword_stats)
    
    # Calculate paper attention scores
    calculate_paper_attention_scores(articles)
    
    return len(top_keywords)

def months_between(ym1, ym2):
    """Calculate months between two year-month strings (format: YYYY-MM)"""
    y1, m1 = map(int, ym1.split('-'))
    y2, m2 = map(int, ym2.split('-'))
    return (y2 - y1) * 12 + (m2 - m1)

def save_keyword_stats(keyword_stats):
    """Save keyword statistics to a JSON file"""
    # Convert defaultdict to regular dict for JSON serialization
    keyword_stats_dict = {k: dict(v) for k, v in keyword_stats.items()}
    
    # Save to file
    try:
        with open('articles/keyword_stats.json', 'w') as f:
            json.dump({
                'keywords': keyword_stats_dict,
                'updated_at': datetime.datetime.now().replace(year=2024).strftime("%Y-%m-%d %H:%M:%S")
            }, f, indent=2)
        print("Saved keyword statistics to articles/keyword_stats.json")
    except Exception as e:
        print(f"Error saving keyword stats: {str(e)}")

def calculate_paper_attention_scores(articles):
    """
    Calculate attention scores for each paper based on multiple factors:
    - Citation count
    - Recency (newer papers with same citations get higher scores)
    - Citation velocity (citations per month)
    - Source prestige (conferences/journals weights)
    """
    print("Calculating paper attention scores...")
    today = datetime.datetime.now().replace(year=2024)
    source_weights = {
        "arXiv": 1.0,
        "CVPR": 1.5, 
        "ICCV": 1.5,
        "NeurIPS": 1.5,
        "ICLR": 1.5,
        "ICML": 1.5,
        "ACL": 1.4,
        "EMNLP": 1.4,
        "AAAI": 1.3,
        "IJCAI": 1.3,
        "Papers With Code": 1.2,
        "Google AI Blog": 1.3,
        "OpenAI Blog": 1.3,
        "Meta AI Research": 1.3,
        "Microsoft Research": 1.3,
        "HuggingFace Blog": 1.2
    }
    
    attention_data = []
    
    for article in articles:
        # Skip articles without proper dates
        if not article.get('date'):
            continue
            
        try:
            # Parse date and calculate age in months
            pub_date = datetime.datetime.strptime(article['date'], '%Y-%m-%d')
            age_months = (today - pub_date).days / 30.0
            
            # Avoid division by zero for very recent papers
            if age_months < 0.1:
                age_months = 0.1
                
            # Get citation count (if available)
            citations = article.get('citation_count', 0)
            
            # Calculate citation velocity (citations per month)
            citation_velocity = citations / age_months
            
            # Apply recency factor (exponential decay with half-life of 24 months)
            recency_factor = math.exp(-0.029 * age_months)  # ln(2)/24 ≈ 0.029
            
            # Get source weight
            source = article.get('source', 'Unknown')
            source_weight = source_weights.get(source, 1.0)
            
            # Calculate final attention score
            # Base score from citations with a log transformation to reduce skew
            base_score = math.log(citations + 1) * 10
            
            # Apply weights and factors
            attention_score = base_score * recency_factor * source_weight
            
            # Boost for very recent papers (less than 3 months old)
            if age_months < 3:
                attention_score *= (1.0 + (3 - age_months) / 3)
                
            # Boost for papers with high citation velocity
            if citation_velocity > 1:
                attention_score *= (1.0 + math.log(citation_velocity) / 2)
                
            # Store components for transparency
            components = {
                'base_score': base_score,
                'recency_factor': recency_factor,
                'source_weight': source_weight,
                'age_months': age_months,
                'citation_velocity': citation_velocity
            }
            
            # Add to article object
            article['attention_score'] = attention_score
            article['attention_components'] = components
            
            # Add to attention data
            attention_data.append({
                'id': article.get('id', ''),
                'title': article.get('title', ''),
                'authors': article.get('authors', []),
                'date': article.get('date', ''),
                'source': article.get('source', ''),
                'url': article.get('url', ''),
                'citation_count': article.get('citation_count', 0),
                'attention_score': article.get('attention_score', 0),
                'components': article.get('attention_components', {})
            })
            
        except Exception as e:
            print(f"Error calculating attention for article {article.get('title')}: {str(e)}")
            continue
    
    # Save to file
    with open('paper_attention.json', 'w') as f:
        json.dump(attention_data, f, indent=2)
    
    print(f"Calculated attention scores for {len(attention_data)} papers")
    
    # Also update the index.json file with the new attention scores
    with open('articles/index.json', 'w') as f:
        json.dump(articles, f, indent=2)
    
    print("Updated index.json with new attention scores")

if __name__ == "__main__":
    keyword_count = fix_trends()
    print(f"Fixed trends for {keyword_count} keywords") 