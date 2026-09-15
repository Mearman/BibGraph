import path from "node:path";

/**
 * Simple build configuration for the web app
 */
export const buildConfig = (isProduction = false) => ({
  // Configure for hash-based routing deployment
  base: "./",

  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "../index.html"),
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        manualChunks: {
          // Core React packages
          vendor: ["react", "react-dom"],
          // BibGraph packages
          academic: ["@bibgraph/client"],
        },
      },
    },
    sourcemap: isProduction ? false : true,
    minify: isProduction ? "terser" : false,
    chunkSizeWarningLimit: 1000,
  },
});
