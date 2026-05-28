"""
Generate the short npm-page README from the GitHub README.

Reads the `.README_npm.md` template, replaces `{{BLOCK NAME}}` placeholders with
the corresponding `<!-- BLOCK NAME -->`-delimited sections from the long
`README.md`, and writes the result to the path passed via `--output`. This lets
us reuse intro/usage prose across both READMEs without duplicating it.

Also:
- Converts GitHub-style admonition blocks (> [!NOTE], etc.) to inline HTML so
  they render reasonably on the npm page.
- Rewrites internal links to absolute GitHub URLs — both `[text](#anchor)` and
  `[text](relative/path.md)` style — so they resolve correctly when viewed on
  npmjs.com.

Invoked by `scripts/stage-package.mjs` during `pnpm build-package`; the output
file lands inside the `build_package/` staging directory, never overwriting the
real repo-root README. Defaults match the legacy in-place flow (output to
`.README_npm_output.md`) for backwards compatibility, but the new flow always
passes an explicit `--output`.
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
    Convert internal Markdown links to full GitHub URLs:
    - [text](#anchor)          -> [text](base_url#anchor)
    - [text](file.md)          -> [text](base_url/blob/main/file.md)
    - [text](file.md#anchor)   -> [text](base_url/blob/main/file.md#anchor)
    - [text](path/to/file.ext) -> [text](base_url/blob/main/path/to/file.ext)

    Absolute URLs (http://, https://, mailto:) and image paths are left untouched.

    Args:
    text (str): The input text containing internal links
    base_url (str): The base URL for the GitHub repository

    Returns:
    str: Text with converted links
    """
    # First pass: rewrite bare anchor links [text](#anchor)
    anchor_pattern = r'\[([^\]]+)\]\(#([^)]+)\)'
    text = re.sub(
        anchor_pattern,
        lambda m: f'[{m.group(1)}]({base_url}#{m.group(2)})',
        text,
    )

    # Second pass: rewrite relative file links [text](some/path.ext) or [text](file.md#anchor)
    # Skip absolute URLs (http/https/mailto), already-anchored links (handled above),
    # and image references (we leave those for an image-host pass elsewhere)
    relative_pattern = r'\[([^\]]+)\]\(([^):#][^)]*?)\)'

    def replace_relative(match):
        link_text = match.group(1)
        target = match.group(2)
        # Skip anything that looks absolute or is a protocol-relative URL
        if target.startswith(('http://', 'https://', 'mailto:', '//', '/')):
            return match.group(0)
        return f'[{link_text}]({base_url}/blob/main/{target})'

    return re.sub(relative_pattern, replace_relative, text)

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

def main():
    import argparse
    parser = argparse.ArgumentParser(
        description='Generate the short npm README by expanding marker blocks from README.md into the .README_npm.md template.'
    )
    parser.add_argument('--template', default='.README_npm.md',
                        help='Path to the npm README template (default: .README_npm.md)')
    parser.add_argument('--source', default='README.md',
                        help='Path to the source README containing the marker blocks (default: README.md)')
    parser.add_argument('--output', default='.README_npm_output.md',
                        help='Path to write the generated README (default: .README_npm_output.md)')
    parser.add_argument('--base-url', default='https://github.com/CarlosNZ/json-edit-react',
                        help='Base GitHub repo URL for rewriting internal links')
    args = parser.parse_args()

    replace_blocks(
        content_file=args.template,
        source_file=args.source,
        output_file=args.output,
        base_url=args.base_url,
    )

if __name__ == '__main__':
    main()