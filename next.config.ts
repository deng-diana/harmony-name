import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to THIS project directory.
  // Otherwise a stray ~/package-lock.json makes Next 16 infer the workspace root
  // as ~, so Turbopack scans ~/Desktop and hits the macOS permission wall
  // (Operation not permitted) → the dev server crashes. Pinning root keeps the
  // scan inside the project. (Alternative fix: delete that stray home lockfile.)
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
