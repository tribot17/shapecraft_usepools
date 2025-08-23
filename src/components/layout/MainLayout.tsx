'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Home,
  MessageSquare,
  LineChart,
  Briefcase,
  Settings,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Market', href: '/market', icon: LineChart },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-64 border-r bg-card"
      >
        <div className="flex h-16 items-center gap-2 px-6 border-b">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <span className="text-2xl">🐕</span>
          </motion.div>
          <motion.span
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="text-xl font-bold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent"
          >
            Scooby
          </motion.span>
        </div>
        <nav className="space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg',
                  'transition-all duration-200 ease-in-out',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary hover:shadow-sm'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg',
              'bg-muted/50 hover:bg-muted transition-colors duration-200',
              'text-muted-foreground hover:text-foreground'
            )}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-5 h-5" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex flex-col min-h-0"
      >
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </motion.div>
    </div>
  );
} 