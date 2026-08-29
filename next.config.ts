import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp ships platform-specific native binaries (libvips). Bundling it
  // with webpack/turbopack's file tracer can drop those .so/.node files
  // from the serverless output; excluding it forces a normal
  // node_modules require at runtime instead, where the full package is
  // present.
  serverExternalPackages: ["sharp"],
  // serverExternalPackages alone stops Next's own bundler from touching
  // sharp, but Vercel's separate output file trace can still miss the
  // native .so files it dynamically resolves at runtime. Force-include the
  // whole package tree in every serverless function's bundle.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*"],
  },
};

export default nextConfig;
