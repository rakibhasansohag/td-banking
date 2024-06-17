import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Added from next.config.js
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  productionBrowserSourceMaps: true,
  experimental: {
    productionTracingIgnoreSpans: true,
  },
};

const sentryWebpackPluginOptions = {
  silent: true,
  org: "developer-rakib",
  project: "td-banking",
  widenClientFileUpload: true,
  transpileClientSDK: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
  integrations: (integrations) => {
    return integrations.filter((integration) => integration.name !== "Prisma");
  },
  ignoreErrors: [
    /Failed to load instrumentation/,
    /node_modules\/@prisma\/instrumentation/,
  ],
};

const sentryOptions = {
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
  configureWebpack: (config, { dev, isServer, webpack }) => {
    console.log(`Webpack config for ${isServer ? "server" : "client"}:`);
    console.log(JSON.stringify(config.resolve.alias, null, 2));
    return config;
  },
};

// Wrap in a function to allow disabling Sentry
const buildConfig = (config) =>
  process.env.SENTRY_DISABLE === "1"
    ? config
    : withSentryConfig(config, sentryWebpackPluginOptions, sentryOptions);

export default buildConfig(nextConfig);
