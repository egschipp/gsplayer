/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    // Subtiele versievermelding voor UI (release tag heeft voorrang)
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version,
    NEXT_PUBLIC_APP_BASE_PATH: process.env.APP_BASE_PATH || '/gsplayer',
  },
};

module.exports = nextConfig;
