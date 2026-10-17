import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // CHAT-CA-06: arquivo de até 10 MB no envio do Chat, mais o envelope do multipart.
    proxyClientMaxBodySize: "11mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: [...securityHeaders] }];
  },
};

export default nextConfig;
