import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js walks up the directory tree looking for a lockfile to infer the
  // workspace root, and picks up unrelated lockfiles outside this repo
  // (e.g. one in the user's home directory) before it gets here. Pinning it
  // explicitly stops the "inferred workspace root may be wrong" warning and
  // keeps output file tracing scoped to this project.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
