const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  experimental: {
    // instrumentationHook: true,
  },
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: [],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  webpack: (config, { dev, isServer, buildId }) => {
    // Enhanced bundle optimization for production
    if (!dev && !isServer) {
      // Advanced code splitting configuration
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
          // React ecosystem
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            priority: 20,
            chunks: 'all',
          },
          // TanStack Query
          tanstack: {
            test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
            name: 'tanstack',
            priority: 15,
            chunks: 'all',
          },
          // Next.js specific
          next: {
            test: /[\\/]node_modules[\\/]next[\\/]/,
            name: 'next',
            priority: 15,
            chunks: 'all',
          },
          // UI libraries
          ui: {
            test: /[\\/]node_modules[\\/](framer-motion|lucide-react)[\\/]/,
            name: 'ui',
            priority: 15,
            chunks: 'all',
          },
          // Maps and visualization
          maps: {
            test: /[\\/]node_modules[\\/](leaflet|react-leaflet)[\\/]/,
            name: 'maps',
            priority: 15,
            chunks: 'all',
          },
          // Authentication
          auth: {
            test: /[\\/]node_modules[\\/](next-auth|@next-auth)[\\/]/,
            name: 'auth',
            priority: 15,
            chunks: 'all',
          },
          // Stripe payments
          stripe: {
            test: /[\\/]node_modules[\\/](@stripe|stripe)[\\/]/,
            name: 'stripe',
            priority: 15,
            chunks: 'all',
          },
          // Utilities
          utils: {
            test: /[\\/]node_modules[\\/](lodash|date-fns|zod)[\\/]/,
            name: 'utils',
            priority: 10,
            chunks: 'all',
          },
        },
      };

      // Bundle analyzer for production builds
      if (process.env.ANALYZE === 'true') {
        const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: 'bundle-analyzer-report.html',
            openAnalyzer: false,
            generateStatsFile: true,
            statsFilename: 'bundle-stats.json',
            statsOptions: {
              source: false,
              reasons: false,
              modules: false,
              chunks: false,
              chunkModules: false,
              chunkOrigins: false,
              assets: false,
              cached: false,
              children: false,
            },
          })
        );
      }

      // Tree shaking optimization
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Module concatenation for better performance
      config.optimization.concatenateModules = true;
      
      // Enable aggressive compression
      config.optimization.minimize = true;
      
      // Bundle size limits
      config.performance = {
        maxAssetSize: 300000, // 300kb
        maxEntrypointSize: 300000, // 300kb
        hints: 'warning',
      };
    }

    // Development optimizations
    if (dev) {
      // Faster builds in development
      config.optimization.removeAvailableModules = false;
      config.optimization.removeEmptyChunks = false;
      config.optimization.splitChunks = false;
      
      // Enable source maps for better debugging
      config.devtool = 'eval-cheap-module-source-map';
    }

    // Universal optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      // Optimize React imports
      'react/jsx-runtime': 'react/jsx-runtime.js',
      'react/jsx-dev-runtime': 'react/jsx-dev-runtime.js',
    };

    // Bundle monitoring plugin
    if (!dev && process.env.MONITOR_BUNDLE === 'true') {
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.done.tap('BundleMonitor', (stats) => {
            const statsData = stats.toJson({
              all: false,
              chunks: true,
              modules: true,
              assets: true,
              reasons: true,
            });
            
            // Save bundle statistics for monitoring
            require('fs').writeFileSync(
              'bundle-stats.json',
              JSON.stringify(statsData, null, 2)
            );
          });
        },
      });
    }
    
    return config;
  },
  
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  poweredByHeader: false,
  
  compress: true,
  
  trailingSlash: false,
  
  swcMinify: true,
});