import { createLibConfig } from "../../vite.config.lib.ts";

export default createLibConfig({
  root: import.meta.dirname,
  name: "BibGraphClient",
  external: ["axios", "axios-rate-limit", "axios-retry", "p-retry"],
});
