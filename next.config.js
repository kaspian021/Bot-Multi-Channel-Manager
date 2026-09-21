/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@electric-sql/pglite', 'pg'],
  },
};

module.exports = nextConfig;
