import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 첫 화면 사진 (Unsplash 라이선스)
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
