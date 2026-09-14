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
      name: 'coucou-agent',
      script: './agent.js',
      cwd: __dirname,
      node_args: '-r dotenv/config',
      env: { NODE_ENV: 'production', DOTENV_CONFIG_PATH: __dirname + '/.env' },
    },
  ],
};
