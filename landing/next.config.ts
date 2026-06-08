import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 100],
  },
  allowedDevOrigins: ['192.168.1.120', 'calent.xyz'],
};

export default nextConfig;
