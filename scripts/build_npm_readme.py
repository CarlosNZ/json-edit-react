"""
Generate the short npm-page README from the GitHub README.

Reads the `.README_npm.md` template, replaces `{{BLOCK NAME}}` placeholders with
the corresponding `<!-- BLOCK NAME -->`-delimited sections from the long source
README (`README_V2.md`), and writes the result to the path passed via
`--output`. This lets us reuse intro/usage prose across both READMEs without
duplicating it.

Also:
- Converts GitHub-style admonition blocks (> [!NOTE], etc.) to plain-markdown
  bold-label blockquotes so they render correctly on the npm page (npm strips
  inline styles, so a styled <div> would gain nothing there).
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

# Emoji per GitHub admonition type. The keyword is matched case-insensitively
# but always rendered upper-case.
ADMONITION_EMOJI = {
    'IMPORTANT': '🚨',
    'NOTE': '📝',
    'WARNING': '⚠️',
    'TIP': '💡',
    'CAUTION': '🛑',
}

def convert_github_admonition(text):
    """
    Convert GitHub-style admonition blocks to a plain-markdown "bold-label
    blockquote" that renders correctly on both GitHub and the npm package page.

    npm's README renderer strips inline `style` attributes and doesn't
    understand the `> [!NOTE]` syntax, so a styled <div> gains nothing there and
    a raw admonition shows the literal "[!NOTE]" text. A bold label inside a
    blockquote degrades gracefully everywhere and keeps any links live:

        > [!NOTE]              > **📝 NOTE**
        > body line       ->   >
        >                      > body line

    Args:
    text (str): The input text potentially containing GitHub admonition blocks

    Returns:
    str: Converted text with admonitions replaced by bold-label blockquotes
    """
    # Match the `> [!TYPE]` opener plus the run of blockquote lines beneath it
    # (any line starting with `>`, so blank `>` separators are preserved).
    pattern = r'^[ \t]*> \[!(\w+)\][ \t]*\n((?:[ \t]*>.*(?:\n|$))*)'

    def replace_admonition(match):
        admonition_type = match.group(1).upper()
        body = match.group(2)
        emoji = ADMONITION_EMOJI.get(admonition_type, '❗')
        # Body lines are already blockquote-prefixed; keep them verbatim and
        # just prepend the bold label plus a blank blockquote line for spacing.
        return f'> **{emoji} {admonition_type}**\n>\n{body}'

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

    # Second pass: rewrite relative file links [text](some/path.ext) or
    # [text](file.md#anchor)
    # Skip absolute URLs (http/https/mailto), already-anchored links (handled
    # above), and markdown images. Images are excluded via a negative lookbehind
    # for `!` — without it `![alt](image.png)` would have its `[alt](image.png)`
    # portion matched and rewritten to a GitHub HTML page URL, which doesn't
    # render as an image on npm.
    relative_pattern = r'(?<!!)\[([^\]]+)\]\(([^):#][^)]*?)\)'

    def replace_relative(match):
        link_text = match.group(1)
        target = match.group(2)
        # Skip anything that looks absolute or is a protocol-relative URL
        if target.startswith(('http://', 'https://', 'mailto:', '//', '/')):
            return match.group(0)
        return f'[{link_text}]({base_url}/blob/main/{target})'

    return re.sub(relative_pattern, replace_relative, text)

def expand_blocks(content, source_content):
    """
    Replace every `{{BLOCK NAME}}` marker in `content` with the matching
    `<!-- BLOCK NAME -->`-delimited section from `source_content`. Markers that
    sit inside an HTML comment are left untouched.
    """
    def replace_non_comment_blocks(match):
        block = match.group(1)
        full_match = match.group(0)
        preceding_content = content[:match.start()]

        # If inside a comment (more `<!--` than `-->` before this point), skip
        comment_starts = len(re.findall(r'<!--', preceding_content))
        comment_ends = len(re.findall(r'-->', preceding_content))
        if comment_starts > comment_ends:
            return full_match

        return extract_block_from_source(source_content, block)

    return re.sub(r'{{(.*?)}}', replace_non_comment_blocks, content)

def build_readme(source_file, template_file=None, output_file=None,
                 base_url="https://github.com/CarlosNZ/json-edit-react",
                 rewrite_links=True):
    """
    Produce an npm-ready README from a source markdown file.

    Two modes:
    - Template mode (core): pass `template_file`. The template's `{{BLOCK}}`
      markers are expanded from the matching sections of `source_file`.
    - Passthrough mode (sub-packages): omit `template_file`. The source README
      is used whole — it already is the full README for that package.

    In both modes GitHub admonitions are converted to bold-label blockquotes.
    Link rewriting (relative/anchor links -> absolute GitHub URLs) is applied
    only when `rewrite_links` is True; sub-package READMEs publish whole, so
    their in-page anchors must stay in-page and link rewriting is skipped.

    Args:
    source_file (str): Path to the source markdown file
    template_file (str, optional): Path to the template; None = passthrough mode
    output_file (str, optional): Path to write to; None returns the string
    base_url (str): Base GitHub repo URL for rewriting internal links
    rewrite_links (bool): Whether to rewrite internal links

    Returns:
    str: Modified content if no output file is specified
    """
    with open(source_file, 'r', encoding='utf-8') as f:
        source_content = f.read()

    if template_file:
        with open(template_file, 'r', encoding='utf-8') as f:
            content = expand_blocks(f.read(), source_content)
    else:
        content = source_content

    content = convert_github_admonition(content)

    if rewrite_links:
        content = convert_internal_links(content, base_url)

    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Modified content written to {output_file}")
        return None

    return content

def main():
    import argparse
    parser = argparse.ArgumentParser(
        description='Generate an npm-ready README: expand {{BLOCK}} markers from the source README into a template (core), or pass a whole README through unchanged (sub-packages). Converts GitHub admonitions to bold-label blockquotes in both cases.'
    )
    parser.add_argument('--template', default=None,
                        help='Path to the npm README template. Omit for passthrough mode (sub-packages), where --source is used whole.')
    parser.add_argument('--source', default='README_V2.md',
                        help='Path to the source README (default: README_V2.md)')
    parser.add_argument('--output', default='.README_npm_output.md',
                        help='Path to write the generated README (default: .README_npm_output.md)')
    parser.add_argument('--base-url', default='https://github.com/CarlosNZ/json-edit-react',
                        help='Base GitHub repo URL for rewriting internal links')
    parser.add_argument('--no-link-rewrite', action='store_true',
                        help='Skip rewriting internal links (used for sub-package READMEs, which publish whole so in-page anchors stay valid).')
    args = parser.parse_args()

    build_readme(
        source_file=args.source,
        template_file=args.template,
        output_file=args.output,
        base_url=args.base_url,
        rewrite_links=not args.no_link_rewrite,
    )

if __name__ == '__main__':
    main()