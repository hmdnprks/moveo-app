import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const webDir  = path.dirname(new URL(import.meta.url).pathname);

// Resolve to the web-local copy of each package so that ../src/ files
// (which webpack resolves against the root node_modules) use the exact
// same module instance as @remotion/player. A dual-instance mismatch
// makes useCurrentFrame() fail because it reads from a different React
// context than the one <Player> provides.
const remotionPkg   = path.join(webDir, 'node_modules', 'remotion');
const remotionMedia = path.join(webDir, 'node_modules', '@remotion', 'media-utils');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Allow importing from outside the web/ directory (the Remotion src/)
    externalDir: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // maplibre-gl uses browser APIs (window, WebGL) — stub it out on the
      // server compilation only. The client bundle needs the real module so
      // the Remotion Player can render the animated map.
      ...(isServer ? { 'maplibre-gl': false } : {}),
      // Force single Remotion instance across root src/ and web/
      'remotion':              remotionPkg,
      '@remotion/media-utils': remotionMedia,
    };
    return config;
  },
};

export default nextConfig;
