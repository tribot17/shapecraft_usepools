import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { MainLayout } from '@/components/layout/MainLayout';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Scooby - Your Stock Trading Companion',
  description: 'AI-powered stock trading assistant that helps you make smarter investment decisions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <MainLayout>{children}</MainLayout>
        </ThemeProvider>
      </body>
    </html>
  );
} 