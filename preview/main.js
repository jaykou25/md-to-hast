import { mdToHast, defaultSchema } from "../bundle.js";

defaultSchema.strip.push("video");
defaultSchema.attributes["video"] = ["src", "controls", "style"];
defaultSchema.tagNames.push("video");
// console.log("defaultSchema", defaultSchema);

const str =
  "这是一行正文\n遥\n\n1. 一行\n   1. 套嵌一行\n   2. 套嵌`vue`二行\n3. 二行\n ```js{1}\n const jay = 1;\n```";

console.log(mdToHast(str, defaultSchema));
// mdToHast(str, defaultSchema);
