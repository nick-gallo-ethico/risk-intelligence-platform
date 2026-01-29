import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-xl text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Ethico Risk Intelligence Platform
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Unified compliance management for ethics hotline intake, case management,
          investigations, disclosures, and policy administration.
        </p>

        <div className="flex gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button variant="outline" size="lg">
            Learn More
          </Button>
        </div>

        <div className="mt-12 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Development Environment
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Backend: <a href="http://localhost:3000/health" className="underline">localhost:3000</a>
          </p>
        </div>
      </div>
    </div>
  );
}
