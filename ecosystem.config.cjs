require('dotenv').config({ path: __dirname + '/.env' });

module.exports = {
  apps: [
    {
      name: 'coucou-site',
      script: './dist/server/entry.mjs',
      cwd: __dirname,
      node_args: '-r dotenv/config',
      env: { NODE_ENV: 'production', DOTENV_CONFIG_PATH: __dirname + '/.env' },
    },
    {
      name: 'coucou-agent-v2',
      script: './agent-v2.js',
      cwd: __dirname,
      node_args: '-r dotenv/config',
      env: { NODE_ENV: 'production', DOTENV_CONFIG_PATH: __dirname + '/.env' },
      max_restarts: 10,
      restart_delay: 5000,
      autorestart: true,
    },
  ],
};
