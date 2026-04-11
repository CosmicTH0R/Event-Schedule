import './globals.css';
import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import EventModal from '@/components/EventModal';
import ClientInit from '@/components/ClientInit';
import LiveBanner from '@/components/LiveBanner';

export const metadata = {
  title: 'EventPulse — Your Personalized Event Feed',
  description:
    'Discover sports, movies, concerts, gaming events — all in one personalized feed.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#6c5ce7',
};

/** Fetch categories server-side — cached for 1 hour */
async function getCategories() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/api/categories`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const categories = await getCategories();

  return (
    <html lang="en">
      <body>
        <ClientInit />
        <Sidebar categories={categories} />
        <main className="main">
          <Topbar />
          <LiveBanner />
          {children}
        </main>
        <EventModal />
      </body>
    </html>
  );
}
