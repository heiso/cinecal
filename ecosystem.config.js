const common = {
  instances: 1,
  autorestart: false,
  log_date_format: 'HH:mm:ss',
  vizion: false,
}

module.exports = {
  apps: [
    {
      ...common,
      name: 'codegen',
      cwd: 'api',
      script: 'npx graphql-codegen --watch',
      watch: ['codegen.ts'],
    },

    {
      ...common,
      name: 'api',
      script: 'npm -w api run dev',
    },
  ],
}
