const { PrismaClient } = require('@prisma/client');
const config = require('./config');

const prisma = new PrismaClient({
  log: config.isDev ? [{ emit: 'event', level: 'query' }] : [],
});

// Warn about slow queries in development only
if (config.isDev) {
  prisma.$on('query', (e) => {
    if (e.duration > 200) {
      console.warn(`[SLOW QUERY] ${e.duration}ms: ${e.query}`);
    }
  });
}

module.exports = prisma;
