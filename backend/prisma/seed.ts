import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface EventData {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  endTime?: string;
  venue?: string;
  location?: string;
  image?: string;
  tags?: string[];
  status?: string;
}

interface SubcategoryData {
  id: string;
  name: string;
  icon: string;
  events: EventData[];
}

interface CategoryData {
  id: string;
  name: string;
  icon: string;
  subcategories: SubcategoryData[];
}

interface SeedData {
  categories: CategoryData[];
}

async function main(): Promise<void> {
  console.log('🌱 Seeding database from events.json...');

  const eventsPath = path.join(__dirname, 'events.json');
  const data: SeedData = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));

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
        const eventDate = new Date(event.date);
        const expiresAt = new Date(eventDate);
        expiresAt.setDate(expiresAt.getDate() + 1);

        await prisma.cachedEvent.upsert({
          where: { externalId: event.id },
          update: {
            title: event.title,
            description: event.description ?? '',
            date: event.date,
            time: event.time ?? '00:00',
            endTime: event.endTime ?? '',
            venue: event.venue ?? '',
            location: event.location ?? '',
            imageUrl: event.image ?? '',
            tags: Array.isArray(event.tags) ? event.tags : event.tags ? [event.tags] : [],
            status: event.status ?? 'upcoming',
            expiresAt,
          },
          create: {
            externalId: event.id,
            source: 'static',
            categoryId: cat.id,
            subcategoryId: sub.id,
            title: event.title,
            description: event.description ?? '',
            date: event.date,
            time: event.time ?? '00:00',
            endTime: event.endTime ?? '',
            venue: event.venue ?? '',
            location: event.location ?? '',
            imageUrl: event.image ?? '',
            tags: Array.isArray(event.tags) ? event.tags : event.tags ? [event.tags] : [],
            status: event.status ?? 'upcoming',
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

