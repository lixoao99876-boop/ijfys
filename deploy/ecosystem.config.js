// PM2 ecosystem - 部署：pm2 start deploy/ecosystem.config.js
// 启动顺序：postgres → meilisearch → ijfys-api → ijfys-web

module.exports = {
  apps: [
    {
      name: "ijfys-api",
      cwd: "./server",
      script: "./node_modules/.bin/ts-node",
      args: "src/main.ts",
      // 生产构建后改为：script: "node", args: "dist/main.js"
      env: {
        NODE_ENV: "production",
      },
      instances: 1,                  // NestJS Cron 不支持多实例，必须 1
      exec_mode: "fork",
      max_memory_restart: "1G",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/pm2/ijfys-api.error.log",
      out_file: "/var/log/pm2/ijfys-api.out.log",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "30s",
      kill_timeout: 8000,
      wait_ready: true,
      listen_timeout: 30000,
    },
    {
      name: "ijfys-web",
      cwd: "./",
      script: "./node_modules/.bin/next",
      args: "start --port 3000",
      env: {
        NODE_ENV: "production",
      },
      instances: 2,                  // Next.js 可水平扩展
      exec_mode: "cluster",
      max_memory_restart: "768M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/pm2/ijfys-web.error.log",
      out_file: "/var/log/pm2/ijfys-web.out.log",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "30s",
    },
    {
      name: "meilisearch",
      script: "/opt/homebrew/bin/meilisearch",
      args: [
        "--db-path", "/var/lib/meili/db",
        "--dump-dir", "/var/lib/meili/dumps",
        "--http-addr", "127.0.0.1:7700",
        "--env", "production",
        "--no-analytics",
      ].join(" "),
      env: {
        // 生产必须设：openssl rand -hex 32
        // MEILI_MASTER_KEY: "set-me-in-production",
      },
      max_memory_restart: "2G",
      instances: 1,
      error_file: "/var/log/pm2/meili.error.log",
      out_file: "/var/log/pm2/meili.out.log",
      merge_logs: true,
      autorestart: true,
    },
  ],
};
