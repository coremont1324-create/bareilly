import { createApp } from './app';
import { config } from './config';
import { runMigrations } from './db/migrate';
import { createPool } from './db/pool';

async function main() {
  const pool = createPool();
  if (process.env.AUTO_MIGRATE !== 'false') {
    console.log('Checking database migrations…');
    await runMigrations(pool);
  }
  const app = createApp(pool);
  const server = app.listen(config.port, () => {
    console.log(`Mandal Schemes Portal listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });
  const shutdown = () => {
    server.close(() => pool.end().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
