import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

async function start() {
  try {
    await connectDatabase();

    const app = createApp();

    const server = app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`[server] Business Management System running on http://localhost:${env.port}`);
      // eslint-disable-next-line no-console
      console.log(`[server] Environment: ${env.nodeEnv}`);
    });

    const shutdown = async (signal) => {
      // eslint-disable-next-line no-console
      console.log(`\n[server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[server] Failed to start:', error);
    process.exit(1);
  }
}

start();
