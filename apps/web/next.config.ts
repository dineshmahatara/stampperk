/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@stampperk/shared'],
};

export default nextConfig;
