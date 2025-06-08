"""
Github README to NPM README transformation script

This script takes the README_npm.md file and replaces the content blocks (marked
by {{ }}) with the corresponding blocks from the main README.md file, which is
for Github. This is so we can re-use the introductory content in both READMEs
without duplicating it.

It also converts Github-style admonition blocks to HTML that mimics Github
styling and converts internal anchor links to full GitHub repository URLs.
"""

import re

def extract_block_from_source(source_content, block_name):
    """
    Extract a block from the source content based on the block name.
    
    Args:
    source_content (str): The entire content of the source markdown file
    block_name (str): The name of the block to extract
    
    Returns:
    str: The extracted block content, or an empty string if not found
    """
    # Create a regex pattern to find the block between comments
    pattern = rf'<!--\s*{block_name}\s*-->(.*?)<!--\s*{block_name}\s*-->'
    
    # Use re.DOTALL to match across multiple lines
    match = re.search(pattern, source_content, re.DOTALL)
    
    return match.group(1).strip() if match else f"[Block {block_name} not found]"

def convert_github_admonition(text):
    """
    Convert Github-style admonition blocks to HTML that mimics Github styling.
    
    Args:
    text (str): The input text potentially containing Github admonition blocks
    
    Returns:
    str: Converted text with Github admonitions replaced by HTML
    """
    # Emoji and color mapping for different admonition types
    admonition_styles = {
        'IMPORTANT': {'emoji': '🚨', 'color': '#d63384'},
        'NOTE': {'emoji': '📝', 'color': '#0075ff'},
        'WARNING': {'emoji': '⚠️', 'color': '#bf8700'},
        'TIP': {'emoji': '💡', 'color': '#3aa76d'}
    }
    
    # Regex to match Github-style admonition blocks
    pattern = r'> \[!(.*?)\]\n((?:> .*\n)*)'
    
    def replace_admonition(match):
        admonition_type = match.group(1)
        content = match.group(2)
        
        # Remove the '> ' prefix from each line while preserving original formatting
        content_lines = [line[2:] for line in content.split('\n') if line.startswith('> ')]
        
        # Use default styles for unknown types
        style = admonition_styles.get(admonition_type, 
                                      {'emoji': '❗', 'color': '#0075ff'})
        
        # Create an HTML block that looks similar to Github's admonition
        content = '\n'.join(content_lines)
        return f'''<div style="background-color: #f6f8fa; border-left: 4px solid {style['color']}; padding: 15px; margin: 15px 0; border-radius: 3px;">
        <p style="margin: 0 0 10px 0; color: {style['color']};">
        <strong>{style['emoji']} {admonition_type}:</strong>
        </p>

{content}
</div>\n'''

    return re.sub(pattern, replace_admonition, text, flags=re.MULTILINE)

def convert_internal_links(text, base_url="https://github.com/CarlosNZ/json-edit-react"):
    """
    Convert internal Markdown anchor links to full GitHub documentation links.
    
    Args:
    text (str): The input text containing internal links
    base_url (str): The base URL for the GitHub repository
    
    Returns:
    str: Text with converted links
    """
    # Regex to match internal Markdown links: [text](#anchor)
    # But avoid matching links that already have a full URL or are not anchors
    pattern = r'\[([^\]]+)\]\(#([^)]+)\)'
    
    def replace_link(match):
        link_text = match.group(1)
        anchor = match.group(2)
        
        # Create the full GitHub URL with the anchor
        return f'[{link_text}]({base_url}#{anchor})'
    
    return re.sub(pattern, replace_link, text)

def replace_blocks(content_file, source_file, output_file=None, base_url="https://github.com/CarlosNZ/json-edit-react"):
    """
    Replace blocks in the content file with corresponding blocks from the source file,
    and convert internal links to full GitHub links.
    
    Args:
    content_file (str): Path to the content markdown file
    source_file (str): Path to the source markdown file
    output_file (str, optional): Path to save the modified content. 
                                If None, returns the modified content.
    base_url (str): The base URL for the GitHub repository
    
    Returns:
    str: Modified content if no output file is specified
    """
    # Read source and content files
    with open(source_file, 'r', encoding='utf-8') as f:
        source_content = f.read()
    
    with open(content_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find block markers to replace, excluding those inside comments
    def replace_non_comment_blocks(match):
        # Check if the match is inside a comment
        block = match.group(1)
        full_match = match.group(0)
        preceding_content = content[:match.start()]
        
        # Count the number of comment start and end tags before this match
        comment_starts = len(re.findall(r'<!--', preceding_content))
        comment_ends = len(re.findall(r'-->', preceding_content))
        
        # If inside a comment (more starts than ends), return the original match
        if comment_starts > comment_ends:
            return full_match
        
        # Otherwise, replace the block, removing the {{ }}
        return extract_block_from_source(source_content, block)
    
    # Use regex with a callback to replace blocks
    modified_content = re.sub(r'{{(.*?)}}', replace_non_comment_blocks, content)
    
    # Convert Github admonition blocks
    modified_content = convert_github_admonition(modified_content)
    
    # Convert internal links to full GitHub links
    modified_content = convert_internal_links(modified_content, base_url)
    
    # If output file is specified, write to file
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(modified_content)
        print(f"Modified content written to {output_file}")
        return None
    
    return modified_content

# Example usage
def main():
    replace_blocks(
        content_file='.README_npm.md', 
        source_file='README.md', 
        output_file='.README_npm_output.md',
        base_url="https://github.com/CarlosNZ/json-edit-react"
    )

if __name__ == '__main__':
    main()