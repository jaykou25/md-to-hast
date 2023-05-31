import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";

export default {
  plugins: [resolve(), commonjs(), babel({ babelHelpers: "bundled" })],
  input: "src/main.js",
  external: [],
  output: {
    file: "bundle.js",
    format: "es",
  },
};
