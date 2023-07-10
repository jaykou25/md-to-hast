import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { frontmatter } from "micromark-extension-frontmatter";

import { gfmFromMarkdown } from "mdast-util-gfm";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";

import { toHast } from "mdast-util-to-hast";

import { visit } from "unist-util-visit";
import { remove } from "unist-util-remove";
import { sanitize, defaultSchema } from "hast-util-sanitize";
import { parseFragment } from "parse5";
import { fromParse5 } from "hast-util-from-parse5";

import Prism from "prismjs";

Prism.manual = true;

const extensionMap = {
  vue: "markup",
  "vue-html": "markup",
  html: "markup",
  md: "markdown",
  rb: "ruby",
  ts: "typescript",
  py: "python",
  sh: "bash",
  yml: "yaml",
  styl: "stylus",
  kt: "kotlin",
  rs: "rust",
};

const toTree = (str) => {
  const tree = fromMarkdown(str, {
    extensions: [gfm(), frontmatter()],
    mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown()],
  });

  return tree;
};

const mdToHast = (str, schema) => {
  const tree = toTree(str);

  /**
   * 将 markdown tree 中的 code 节点的 lang 属性映射到 hast 中
   */
  visit(tree, "code", function (node) {
    if (!node.data) node.data = {};
    if (!node.data.hProperties) node.data.hProperties = {};
    node.data.hProperties.lang = node.lang;
  });

  /**
   * 这个 hast 树里可能会包含 h5源码(type: 'raw')
   * 需要将他们转换成 hast
   */
  const hast = toHast(tree, {
    allowDangerousHtml: true,
  });

  console.log("totree", { markdownTree: tree, hast });

  /**
   * 去除掉空节点 { type: 'text', value: '\n'}
   */
  remove(hast, "text", (node) => {
    return node.value === "\n";
  });

  /**
   * 遍历 element 元素:
   * 处理 tagName: raw 的内容, 将 h5 源码转化成 hast
   */
  visit(hast, "raw", (node) => {
    // 把 html 字符串转化成 hast
    const parse5Tree = parseFragment(node.value.trim());
    const hast = fromParse5(parse5Tree.childNodes[0]);
    const { type, properties, children, tagName } = hast;
    node.type = type;
    node.properties = properties;
    node.children = children;
    node.tagName = tagName;
    delete node.value;
  });

  /**
   * 遍历 element 元素:
   * 处理 tagName: pre > code, 将内容高亮
   */
  visit(hast, "element", (node) => {
    if (node.tagName === "pre") {
      /**
       * 找出 pre 下面 tagName 是 code 的元素 (注意要找 pre > code, 单纯的 code 元素可能是行内 code)
       * 将 code 元素里的值高亮处理
       */
      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => {
          if (child.tagName === "code") {
            handleCode(child);
          }
        });
      }
    }
  });

  function handleCode(node) {
    if (node.children && node.children.length > 0) {
      const lan = node.properties.lang;
      node.children.forEach((child) => {
        if (lan) {
          const text = Prism.highlight(
            child.value,
            Prism.languages[extensionMap[lan] || lan] || Prism.languages.txt,
            lan
          );

          child.value = text;
        } else {
          const text = Prism.highlight(child.value, Prism.languages.txt, "txt");

          child.value = text;
        }
      });
    }
  }

  return sanitize(hast, schema);
};

export { toTree, mdToHast, visit, defaultSchema };
