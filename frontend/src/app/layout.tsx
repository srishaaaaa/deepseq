import BubbleTrail from '@/components/BubbleTrail';
import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'eDNA Globe',
  description: 'Interactive species globe',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Global cinematic effects */}
        <BubbleTrail />      {/* Water-like bubble trail */}
        {children}
      </body>
    </html>
  );
}
