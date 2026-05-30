import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { NavBar } from '@/components/NavBar';
import { TeamProvider } from '@/components/TeamProvider';
import { TeamWatermark } from '@/components/TeamWatermark';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RL 6Mans West — Scrim Scheduler',
  description: 'Schedule scrims for the RL 6Mans West Discord server',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-surface min-h-screen`}>
        <TeamProvider>
          <TeamWatermark />
          <NavBar />
          <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">{children}</main>
        </TeamProvider>
      </body>
    </html>
  );
}
