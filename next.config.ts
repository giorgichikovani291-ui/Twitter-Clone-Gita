import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native (.node) module — it must stay outside the
  // bundler or the server build fails with a bindings/module-not-found error.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
