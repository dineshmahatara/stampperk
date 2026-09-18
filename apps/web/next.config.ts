/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@stampperk/shared'],
  // Render monorepo installs can miss next's nested eslint parser; typecheck still runs.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
