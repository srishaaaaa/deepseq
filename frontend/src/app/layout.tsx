import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import BubbleTrail from '@/components/BubbleTrail';
import AmbientOcean from '@/components/ambient/AmbientOcean';
import Providers from '@/components/Providers';
import './globals.css';

const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'DeepSeq — Explore the Invisible. Decode the Ocean.', template: '%s · DeepSeq' },
  description: 'Environmental DNA (eDNA) analysis and interactive marine biodiversity exploration.',
};

export const viewport: Viewport = {
  themeColor: '#030810',
  colorScheme: 'dark',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="grain min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-biolum focus:px-4 focus:py-2 focus:text-abyss"
        >
          Skip to content
        </a>
        <Providers>
          <AmbientOcean />
          <BubbleTrail />
          <div className="relative z-10">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
