/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    // Subtiele versievermelding voor UI
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version,
  },
};

module.exports = nextConfig;
