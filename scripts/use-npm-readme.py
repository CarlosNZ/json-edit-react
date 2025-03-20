#!/usr/bin/env python3
"""
use-npm-readme.py

This script handles the README file swapping process for npm publishing.
It provides both a function to prepare the README for publishing and
a separate function to restore the original README after publishing.
"""

import os
import shutil
import sys
import argparse


def prepare_for_publish():
    """
    Prepare README for npm publishing by replacing it with the npm-compatible version.
    """
    # Backup the original README if it hasn't been backed up already
    if os.path.exists('README.md') and not os.path.exists('.original-readme.md'):
        shutil.copy2('README.md', '.original-readme.md')
        print("Original README backed up as .original-readme.md")
    
    # Use the npm version as the main README
    if os.path.exists('.npm-readme.md'):
        shutil.copy2('.npm-readme.md', 'README.md')
        print("npm-compatible README is now in place for publishing")
    else:
        print("Error: .npm-readme.md not found. Run the conversion script first.")
        sys.exit(1)


def restore_after_publish():
    """
    Restore the original README after npm publishing completes.
    """
    # Restore the original README
    if os.path.exists('.original-readme.md'):
        shutil.copy2('.original-readme.md', 'README.md')
        os.remove('.original-readme.md')
        print("Original README restored")
    else:
        print("Warning: No backed-up README found to restore")
    
    # Remove the temporary npm README
    if os.path.exists('.npm-readme.md'):
        os.remove('.npm-readme.md')
        print("Temporary npm README removed")


def main():
    parser = argparse.ArgumentParser(
        description='Manage README files for npm publishing process'
    )
    parser.add_argument(
        'action', 
        choices=['prepare', 'restore'],
        help='Action to perform: "prepare" before publishing or "restore" after'
    )
    
    args = parser.parse_args()
    
    if args.action == 'prepare':
        prepare_for_publish()
    elif args.action == 'restore':
        restore_after_publish()


if __name__ == "__main__":
    main()