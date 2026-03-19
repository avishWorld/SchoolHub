/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel deployment: ensure images and fonts work
  images: {
    unoptimized: false,
  },
  // Suppress specific ESLint rules during build (test files)
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
