/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA headers and image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
