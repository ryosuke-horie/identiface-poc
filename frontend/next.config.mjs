/** @type {import('next').NextConfig} */
// CloudFrontの仕様に合わせてtrailingSlashをtrueにする
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  output: 'export',
};

export default nextConfig;
