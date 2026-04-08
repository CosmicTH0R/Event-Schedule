const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database from events.json...');

  const eventsPath = path.join(__dirname, '../../v1/data/events.json');
  const data = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));

  let catCount = 0;
  let subCount = 0;
  let eventCount = 0;

  for (const [catIndex, cat] of data.categories.entries()) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name, icon: cat.icon, sortOrder: catIndex },
      create: { id: cat.id, name: cat.name, icon: cat.icon, sortOrder: catIndex },
    });
    catCount++;

    for (const [subIndex, sub] of cat.subcategories.entries()) {
      await prisma.subcategory.upsert({
        where: { id: sub.id },
        update: { name: sub.name, icon: sub.icon, categoryId: cat.id, sortOrder: subIndex },
        create: {
          id: sub.id,
          name: sub.name,
          icon: sub.icon,
          categoryId: cat.id,
          sortOrder: subIndex,
        },
      });
      subCount++;

      for (const event of sub.events) {
        // Static events expire 1 day after their event date
        const eventDate = new Date(event.date);
        const expiresAt = new Date(eventDate);
        expiresAt.setDate(expiresAt.getDate() + 1);

        await prisma.cachedEvent.upsert({
          where: { externalId: event.id },
          update: {
            title: event.title,
            description: event.description || '',
            date: event.date,
            time: event.time || '00:00',
            endTime: event.endTime || '',
            venue: event.venue || '',
            location: event.location || '',
            imageUrl: event.image || '',
            tags: Array.isArray(event.tags) ? event.tags.join('|') : '',
            status: event.status || 'upcoming',
            expiresAt,
          },
          create: {
            externalId: event.id,
            source: 'static',
            categoryId: cat.id,
            subcategoryId: sub.id,
            title: event.title,
            description: event.description || '',
            date: event.date,
            time: event.time || '00:00',
            endTime: event.endTime || '',
            venue: event.venue || '',
            location: event.location || '',
            imageUrl: event.image || '',
            tags: Array.isArray(event.tags) ? event.tags.join('|') : '',
            status: event.status || 'upcoming',
            expiresAt,
          },
        });
        eventCount++;
      }
    }
  }

  console.log(
    `✅ Seeded: ${catCount} categories, ${subCount} subcategories, ${eventCount} events`
  );
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
