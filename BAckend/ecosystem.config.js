/**
 * ecosystem.config.js — PM2 Process Manager Cluster Configuration.
 */

module.exports = {
  apps: [
    {
      name: 'kiaan-erp-backend',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
        DB_DRIVER: 'prisma',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        DB_DRIVER: 'prisma',
      },
      max_memory_restart: '1G',
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
};
