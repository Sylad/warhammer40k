export default () => ({
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:4201',
  anthropicApiKey: process.env['ANTHROPIC_API_KEY'],
});
