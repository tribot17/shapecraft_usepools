import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to Scooby 🐕</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Your AI-powered stock trading companion
      </p>
      <Link
        href="/chat"
        className="inline-flex items-center px-6 py-3 text-lg font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
      >
        Start Trading
      </Link>
    </div>
  );
} 