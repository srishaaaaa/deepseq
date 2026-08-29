import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js walks up the directory tree looking for a lockfile to infer the
  // workspace root, and picks up unrelated lockfiles outside this repo
  // (e.g. one in the user's home directory) before it gets here. Pinning it
  // explicitly stops the "inferred workspace root may be wrong" warning and
  // keeps output file tracing scoped to this project.
  outputFileTracingRoot: path.join(__dirname),

  experimental: {
    // Next 15.5's dev-only "Segment Explorer" devtool crashes while
    // serializing routes that use next/dynamic with ssr:false (home, globe,
    // explore, ...), producing intermittent 500s and 10-20s dev loads
    // ("segment-explorer-node.js" + "__webpack_modules__[moduleId] is not a
    // function" in the terminal). Turning the overlay panel off removes that
    // code path. Dev-only; no effect on the production build or any app
    // feature.
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
