/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true, // This will allow the build to continue even with ESLint errors
    },
    typescript: {
      ignoreBuildErrors: true, // This will allow the build to continue even with TypeScript errors
    },
  }
  
  module.exports = nextConfig