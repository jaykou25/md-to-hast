import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { frontmatter } from "micromark-extension-frontmatter";

import { gfmFromMarkdown } from "mdast-util-gfm";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";

import { toHast } from "mdast-util-to-hast";

import { visit } from "unist-util-visit";
import { raw } from "hast-util-raw";
import { sanitize, defaultSchema } from "hast-util-sanitize";

const toTree = (str) => {
  const tree = fromMarkdown(str, {
    extensions: [gfm(), frontmatter()],
    mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown()],
  });

  return tree;
};

const mdToHast = (str, schema) => {
  const tree = toTree(str);
  const hast = raw(toHast(tree, { allowDangerousHtml: true }));
  return sanitize(hast, schema);
};

export { toTree, mdToHast, visit, defaultSchema };
