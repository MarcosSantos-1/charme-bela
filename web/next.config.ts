import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Desabilita ESLint durante build para deploy
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora erros de TypeScript durante build
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
