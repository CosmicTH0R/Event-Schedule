import { PrismaClient } from '@prisma/client';
import config from './config';

const prisma = new PrismaClient({
  log: config.isDev ? [{ emit: 'event', level: 'query' }] : [],
});

if (config.isDev) {
  prisma.$on('query', (e) => {
    if (e.duration > 200) {
      console.warn(`[SLOW QUERY] ${e.duration}ms: ${e.query}`);
    }
  });
}

export default prisma;
