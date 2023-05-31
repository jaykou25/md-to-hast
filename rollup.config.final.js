import resolve from "@rollup/plugin-node-resolve";

export default {
  plugins: [resolve()],
  input: "bundle.js",
  external: [],
  output: {
    file: "bundleFinal.js",
    format: "es",
  },
};
