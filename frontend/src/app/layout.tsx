import BubbleTrail from '@/components/BubbleTrail';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

export const metadata = {
  title: 'eDNA Globe',
  description: 'Interactive species globe',
};

// Runs before first paint so the saved theme is applied with no flash of
// the wrong palette. Mirrors ThemeProvider's storage key + logic.
const themeInitScript = `(function(){try{var t=localStorage.getItem('deepseq-theme');if(t!=='light'&&t!=='dark')t='dark';var e=document.documentElement;e.setAttribute('data-theme',t);e.style.colorScheme=t;}catch(_){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            {/* Global cinematic effects */}
            <BubbleTrail />      {/* Water-like bubble trail */}
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
