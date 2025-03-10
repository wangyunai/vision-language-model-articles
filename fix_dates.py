#!/usr/bin/env python3
"""
Fix dates in articles to ensure they're in 2024 instead of 2025
"""

import json
import datetime
import os

def fix_dates():
    print("Fixing dates in articles...")
    
    # Load the index file
    with open('articles/index.json', 'r') as f:
        articles = json.load(f)
    
    # Track how many articles were fixed
    fixed_count = 0
    
    # Fix dates in all articles
    for article in articles:
        try:
            date_str = article.get('date', '')
            if not date_str:
                continue
                
            # Parse the date
            date_obj = datetime.datetime.strptime(date_str, "%Y-%m-%d")
            
            # If the year is 2025, change it to 2024
            if date_obj.year == 2025:
                # Create a new date with 2024 instead of 2025
                fixed_date = f"2024-{date_obj.month:02d}-{date_obj.day:02d}"
                article['date'] = fixed_date
                fixed_count += 1
                print(f"Fixed date for article: {article['title']} - {date_str} -> {fixed_date}")
                
                # Also fix the individual article file if it exists
                article_file = f"articles/{article['id']}.json"
                if os.path.exists(article_file):
                    try:
                        with open(article_file, 'r') as af:
                            article_data = json.load(af)
                        
                        article_data['date'] = fixed_date
                        
                        with open(article_file, 'w') as af:
                            json.dump(article_data, af, indent=2)
                    except Exception as e:
                        print(f"Error fixing individual article file {article_file}: {str(e)}")
        except Exception as e:
            print(f"Error processing article {article.get('title', 'Unknown')}: {str(e)}")
    
    # Save the updated index file
    with open('articles/index.json', 'w') as f:
        json.dump(articles, f, indent=2)
    
    print(f"Fixed dates for {fixed_count} articles")
    
    # Also fix the keyword stats file
    try:
        if os.path.exists('articles/keyword_stats.json'):
            with open('articles/keyword_stats.json', 'r') as f:
                keyword_stats = json.load(f)
            
            # Update the updated_at field
            if 'updated_at' in keyword_stats:
                date_str = keyword_stats['updated_at']
                try:
                    date_obj = datetime.datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                    if date_obj.year == 2025:
                        fixed_date = date_obj.replace(year=2024)
                        keyword_stats['updated_at'] = fixed_date.strftime("%Y-%m-%d %H:%M:%S")
                        print(f"Fixed date in keyword_stats.json: {date_str} -> {keyword_stats['updated_at']}")
                except Exception:
                    pass
            
            # Fix dates in mentions_by_month
            if 'keywords' in keyword_stats:
                for keyword, stats in keyword_stats['keywords'].items():
                    if 'mentions_by_month' in stats:
                        new_mentions = {}
                        for month, count in stats['mentions_by_month'].items():
                            if month.startswith('2025-'):
                                new_month = f"2024-{month[5:]}"
                                new_mentions[new_month] = count
                                print(f"Fixed month in keyword stats for {keyword}: {month} -> {new_month}")
                            else:
                                new_mentions[month] = count
                        stats['mentions_by_month'] = new_mentions
            
            with open('articles/keyword_stats.json', 'w') as f:
                json.dump(keyword_stats, f, indent=2)
    except Exception as e:
        print(f"Error fixing keyword stats: {str(e)}")
    
    # Fix paper_attention.json if it exists
    try:
        if os.path.exists('paper_attention.json'):
            with open('paper_attention.json', 'r') as f:
                paper_attention = json.load(f)
            
            fixed_papers = 0
            for paper in paper_attention:
                if 'date' in paper and paper['date'].startswith('2025-'):
                    date_obj = datetime.datetime.strptime(paper['date'], "%Y-%m-%d")
                    fixed_date = f"2024-{date_obj.month:02d}-{date_obj.day:02d}"
                    paper['date'] = fixed_date
                    fixed_papers += 1
            
            with open('paper_attention.json', 'w') as f:
                json.dump(paper_attention, f, indent=2)
            
            print(f"Fixed dates for {fixed_papers} papers in paper_attention.json")
    except Exception as e:
        print(f"Error fixing paper attention data: {str(e)}")
    
    return fixed_count

if __name__ == "__main__":
    fixed_count = fix_dates()
    print(f"Total articles fixed: {fixed_count}") 