import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'RepVoice - Voice-Based Gym Workout Tracker',
  description: 'Log workouts hands-free with voice recognition, persistent Supabase sync, and gym-focused design.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RepVoice',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-zinc-100 flex flex-col antialiased selection:bg-white selection:text-black">
        <Navbar />
        <main className="flex-1 max-w-md w-full mx-auto pb-24 px-4 pt-3">
          {children}
        </main>
      </body>
    </html>
  );
}
