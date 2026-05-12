/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    typescript: {
      ignoreBuildErrors: true, // This will allow the build to continue even with TypeScript errors
    },
  }
  
  module.exports = nextConfig