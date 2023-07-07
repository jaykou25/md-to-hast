import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { frontmatter } from "micromark-extension-frontmatter";

import { gfmFromMarkdown } from "mdast-util-gfm";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";

import { toHast } from "mdast-util-to-hast";

import { visit } from "unist-util-visit";
import { remove } from "unist-util-remove";
import { sanitize, defaultSchema } from "hast-util-sanitize";
import { zwitch } from "zwitch";
import { parseFragment } from "parse5";
import { fromParse5 } from "hast-util-from-parse5";

import hljs from "highlight.js/lib/common";

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
   *
   * 处理 tagName: pre > code, 将内容高亮
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

  visit(hast, "element", (node) => {
    if (node.tagName === "pre") {
      console.log("处理pre元素", node);
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

  /**
   * 处理函数, 处理键值是 type 的对象
   * 默认只处理一层, 并不会遍历 children
   */
  const one = zwitch("type", {
    handlers: { root, raw: handleRaw, element: handleElement },
  });

  const handler = (node) => {
    one(node, handler);
  };

  function all(nodes, handler) {
    let index = -1;

    if (nodes) {
      while (++index < nodes.length) {
        handler(nodes[index]);
      }
    }
  }

  function root(node, handler) {
    all(node.children, handler);
  }

  function handleRaw(node) {
    // 把 html 字符串转化成 hast
    const parse5Tree = parseFragment(node.value.trim());
    const hast = fromParse5(parse5Tree.childNodes[0]);
    const { type, properties, children, tagName } = hast;
    node.type = type;
    node.properties = properties;
    node.children = children;
    node.tagName = tagName;
    delete node.value;
    // console.log("handleRaw", { node, parse5Tree, hast });
  }

  function handleElement(node) {
    if (node.tagName === "pre") {
      console.log("处理pre元素", node);
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
  }

  function handleCode(node) {
    if (node.children && node.children.length > 0) {
      const lan = node.properties.lang;
      node.children.forEach((child) => {
        // todo: 指定语言
        if (lan) {
          console.log("highlight:", {
            lan,
            hljs: hljs.highlight(child.value, { language: lan }),
          });
          child.value = hljs.highlight(child.value, { language: lan }).value;
        } else {
          console.log("highlight-auto:", {
            lan,
            hljs: hljs.highlight(child.value, { language: lan }),
          });
          child.value = hljs.highlightAuto(child.value).value;
        }
      });
    }
  }

  // function unknown() {
  //   console.log("unknow do noting");
  // }

  // one(hast, handler);

  // console.log({ hast });
  return sanitize(hast, schema);
};

export { toTree, mdToHast, visit, defaultSchema };
