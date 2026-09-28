export default () => ({
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:4201',
  anthropicApiKey: process.env['ANTHROPIC_API_KEY'],
  appPin: process.env['APP_PIN'] ?? '',
  // DEMO_FORCED=true : l'instance ENTIÈRE est verrouillée en démo, sans
  // dépendre d'aucun en-tête HTTP (cf. modules/demo/forced-demo.ts, L22).
  // Off par défaut.
  demoForcedAll: (process.env['DEMO_FORCED'] ?? '').trim().toLowerCase() === 'true',
  // Comma-separated list of host substrings that ALWAYS run in demo (locked)
  // mode. Any request whose Host header (never X-Forwarded-Host, which the
  // client controls) contains one of
  // these substrings is forced into demo mode: writes are blocked, the badge
  // "Mode démo verrouillée" is shown, and PIN auth is bypassed.
  // Default covers Cloudflare quick tunnels and the public showcase domain.
  demoForcedHosts: (process.env['DEMO_FORCED_HOSTS'] ?? 'trycloudflare.com,cfargotunnel.com,warhammer.sladoire.dev')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
});
