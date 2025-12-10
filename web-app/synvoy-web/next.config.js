/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    domains: ['localhost'],
  },
  // Allow cross-origin requests from the backend IP during development
  allowedDevOrigins: ['192.168.50.225'],
};

module.exports = nextConfig;
