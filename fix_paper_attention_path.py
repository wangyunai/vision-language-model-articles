#!/usr/bin/env python3
import json
import shutil
import os
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('fix_path')


def main():
    logger.info("Copying paper_attention.json to the correct location")
    
    source_file = 'articles/paper_attention.json'
    target_file = 'paper_attention.json'
    
    if not os.path.exists(source_file):
        logger.error(f"Source file {source_file} does not exist!")
        return
    
    # Copy the file
    try:
        shutil.copy2(source_file, target_file)
        logger.info(f"Successfully copied {source_file} to {target_file}")
    except Exception as e:
        logger.error(f"Error copying file: {e}")
        return
    
    # Verify the file was copied correctly
    try:
        with open(target_file, 'r') as f:
            data = json.load(f)
            logger.info(f"Verified {target_file} contains {len(data)} papers")
    except Exception as e:
        logger.error(f"Error verifying file: {e}")


if __name__ == "__main__":
    main() 