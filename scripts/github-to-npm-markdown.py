#!/usr/bin/env python3
"""
GitHub Markdown to npm README Converter

This script converts a GitHub-flavored Markdown document to a format suitable for npm README files.
It handles specific GitHub Markdown features that might not render properly in npm.
"""

import re
import sys
import os
import argparse


def convert_github_to_npm_markdown(content):
    """
    Convert GitHub-flavored Markdown to npm-compatible Markdown.
    
    Args:
        content (str): GitHub Markdown content
        
    Returns:
        str: npm-compatible Markdown content
    """
    # 1. Replace GitHub-specific emoji syntax with Unicode emojis
    # This is a simplified example for common emojis
    emoji_map = {
        ':smile:': '😄',
        ':heart:': '❤️',
        ':thumbsup:': '👍',
        ':warning:': '⚠️',
        ':rocket:': '🚀',
        ':star:': '⭐',
        ':zap:': '⚡',
        ':bug:': '🐛',
        ':information_source:': 'ℹ️',
        ':memo:': '📝',
        ':bulb:': '💡',
        ':exclamation:': '❗',
        # Add more emoji mappings as needed
    }
    
    for emoji_code, unicode_emoji in emoji_map.items():
        content = content.replace(emoji_code, unicode_emoji)
    
    # 2. Convert GitHub-style task lists to standard Markdown
    content = re.sub(r'\[ \]', '□', content)
    content = re.sub(r'\[x\]', '✓', content)
    
    # 3. Replace relative image links with absolute links
    # This assumes that images are in the same repository
    # You might need to adjust the repo URL for your specific case
    def replace_image_links(match):
        image_path = match.group(2)
        alt_text = match.group(1)
        
        if image_path.startswith('http'):
            # Already an absolute URL
            return f'![{alt_text}]({image_path})'
        elif image_path.startswith('./') or image_path.startswith('/'):
            # Relative URL - needs conversion
            # Replace with your actual GitHub repository URL
            repo_url = "https://github.com/username/repo/raw/main"
            image_path = image_path.lstrip('./')
            image_path = image_path.lstrip('/')
            return f'![{alt_text}]({repo_url}/{image_path})'
        else:
            # Also relative but without leading ./ or /
            repo_url = "https://github.com/username/repo/raw/main"
            return f'![{alt_text}]({repo_url}/{image_path})'
    
    content = re.sub(r'!\[(.*?)\]\((.*?)\)', lambda m: replace_image_links(m), content)
    
    # 4. Convert GitHub-style collapsible sections to regular sections
    content = re.sub(
        r'<details>\s*<summary>(.*?)</summary>\s*(.*?)\s*</details>',
        r'### \1\n\n\2',
        content,
        flags=re.DOTALL
    )
    
    # 5. Make sure badges use absolute URLs for images
    def fix_badge_urls(match):
        alt = match.group(1)
        url = match.group(2)
        link = match.group(3)
        
        if not url.startswith('http'):
            # Add a common badge domain as fallback
            url = f"https://img.shields.io/{url}"
        
        return f'[![{alt}]({url})]({link})'
    
    content = re.sub(r'!\[(.*?)\]\(((?!http).*?)\)\]\((.*?)\)', fix_badge_urls, content)
    
    # 6. Convert GitHub-specific syntax highlighting to standard code blocks
    # npm README renderer supports language tags but with different processing
    content = re.sub(r'```(\w+)', r'```\1', content)
    
    # 7. ADDED: Convert GitHub-specific admonition boxes (> [!NOTE], > [!WARNING], etc.)
    admonition_map = {
        'NOTE': 'ℹ️ **Note**',
        'TIP': '💡 **Tip**',
        'IMPORTANT': '❗ **Important**',
        'WARNING': '⚠️ **Warning**',
        'CAUTION': '🔥 **Caution**',
        'DANGER': '⛔ **DANGER**'
    }
    
    def convert_admonition(match):
        admonition_type = match.group(1).upper()
        content = match.group(2)
        
        # Process the content: remove leading '>' from each line
        lines = content.split('\n')
        processed_lines = []
        for line in lines:
            if line.strip().startswith('>'):
                processed_lines.append(line.strip()[1:].strip())
            else:
                processed_lines.append(line)
        
        processed_content = '\n'.join(processed_lines)
        
        # Format with the appropriate heading
        header = admonition_map.get(admonition_type, f'**{admonition_type}**')
        return f'<div style="padding: 8px; border-left: 4px solid #888; background-color: #f8f8f8; margin: 10px 0;">\n{header}\n{processed_content}\n</div>'
    
    # Match GitHub admonition syntax: > [!NOTE] followed by content
    content = re.sub(r'>\s*\[\!(.*?)\](.*?)(?=\n\s*\n|\Z)', convert_admonition, content, flags=re.DOTALL)
    
    # 8. Add a note about this being converted from GitHub
    npm_notice = (
        "<!-- This README was converted from GitHub-flavored Markdown to npm format. -->\n"
        "<!-- Some elements may display differently on npmjs.com vs. GitHub. -->\n\n"
    )
    
    return npm_notice + content


def main():
    parser = argparse.ArgumentParser(description='Convert GitHub Markdown to npm README format')
    parser.add_argument('input_file', help='Path to GitHub Markdown file')
    parser.add_argument('-o', '--output', help='Output file path (defaults to README.md)')
    parser.add_argument('--repo-url', help='GitHub repository URL for fixing relative links')
    
    args = parser.parse_args()
    
    # Set default output filename if not provided
    output_file = args.output if args.output else 'README.md'
    
    # Read input file
    try:
        with open(args.input_file, 'r', encoding='utf-8') as file:
            github_markdown = file.read()
    except FileNotFoundError:
        print(f"Error: Input file '{args.input_file}' not found.")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading input file: {e}")
        sys.exit(1)
    
    # Convert markdown
    npm_markdown = convert_github_to_npm_markdown(github_markdown)
    
    # Write output file
    try:
        with open(output_file, 'w', encoding='utf-8') as file:
            file.write(npm_markdown)
        print(f"Conversion successful. Output written to '{output_file}'")
    except Exception as e:
        print(f"Error writing output file: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
