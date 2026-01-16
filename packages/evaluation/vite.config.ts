import { createLibConfig } from "../../vite.config.lib";

export default createLibConfig({
  root: __dirname,
  name: "BibGraphEvaluation",
  external: ["@bibgraph/types", "@bibgraph/algorithms"],
});
