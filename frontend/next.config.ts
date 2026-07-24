import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      // AWS S3 (any bucket, any region)
      { protocol: "https", hostname: "*.amazonaws.com" },
      // CloudFront CDN (if used in front of S3)
      { protocol: "https", hostname: "*.cloudfront.net" },
      // Unsplash (for any existing/demo listings)
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
