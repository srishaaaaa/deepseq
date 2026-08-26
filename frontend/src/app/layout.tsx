import BubbleTrail from '@/components/BubbleTrail';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata = {
  title: 'eDNA Globe',
  description: 'Interactive species globe',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {/* Global cinematic effects */}
          <BubbleTrail />      {/* Water-like bubble trail */}
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
