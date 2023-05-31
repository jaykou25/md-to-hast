import { mdToHast, defaultSchema } from "../bundle.js";

defaultSchema.attributes["video"] = ["src", "controls", "style"];
defaultSchema.tagNames.push("video");
console.log("defaultSchema", defaultSchema);

const str =
  '<video controls src="https://ttnote.cn/videos/David-Chipperfield.mp4">\n</video>';

console.log(mdToHast(str, defaultSchema));
