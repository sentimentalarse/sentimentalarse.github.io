/* Build-time Markdown renderer. Raw HTML supports author-provided chart containers. */
const fs = require('node:fs');
const MarkdownIt = require('markdown-it');
const markdown = new MarkdownIt({html: true});
process.stdout.write(markdown.render(fs.readFileSync(0, 'utf8')));
