module.exports = {
  apps: [{
    name: 'outscroll-api',
    script: 'server.js',
    cwd: __dirname,
    env: {
      DATABASE_URL: 'postgresql://outscroll:outscroll123@localhost:5432/outscroll',
      JWT_SECRET: 'outscroll-local-dev-secret-2024',
      PORT: 3456,
      FRONTEND_URL: 'http://localhost:5173',
    }
  }]
};
