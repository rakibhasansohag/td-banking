import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  productionBrowserSourceMaps: true,

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, "@prisma/instrumentation"];
    }
    return config;
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
};

// Wrap in a function to allow disabling Sentry
const buildConfig = (config) =>
  process.env.SENTRY_DISABLE === "1"
    ? config
    : withSentryConfig(config, sentryWebpackPluginOptions, sentryOptions);

export default buildConfig(nextConfig);
