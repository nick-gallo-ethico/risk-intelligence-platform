import { InternalLayout } from '@/components/InternalLayout';
import Link from 'next/link';
import { Headphones, Shield, ListChecks, BarChart3 } from 'lucide-react';

export default function OpsConsoleDashboard() {
  return (
    <InternalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Internal Operations Dashboard</h1>
          <p className="text-gray-500">Welcome to the Ethico Internal Operations Console</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Link
            href="/hotline"
            className="p-6 bg-white border rounded-lg hover:shadow-md transition-shadow"
          >
            <Headphones className="h-10 w-10 text-purple-500 mb-4" />
            <h2 className="text-lg font-semibold">Hotline Operations</h2>
            <p className="text-sm text-gray-500 mt-1">
              QA queue, directives management, operator status
            </p>
          </Link>

          <Link
            href="/support"
            className="p-6 bg-white border rounded-lg hover:shadow-md transition-shadow"
          >
            <Shield className="h-10 w-10 text-blue-500 mb-4" />
            <h2 className="text-lg font-semibold">Support Console</h2>
            <p className="text-sm text-gray-500 mt-1">
              Tenant access, issue diagnosis, debug tools
            </p>
          </Link>

          <Link
            href="/implementations"
            className="p-6 bg-white border rounded-lg hover:shadow-md transition-shadow"
          >
            <ListChecks className="h-10 w-10 text-green-500 mb-4" />
            <h2 className="text-lg font-semibold">Implementations</h2>
            <p className="text-sm text-gray-500 mt-1">
              Client onboarding, data migration, go-live
            </p>
          </Link>

          <Link
            href="/health"
            className="p-6 bg-white border rounded-lg hover:shadow-md transition-shadow"
          >
            <BarChart3 className="h-10 w-10 text-orange-500 mb-4" />
            <h2 className="text-lg font-semibold">Client Health</h2>
            <p className="text-sm text-gray-500 mt-1">
              Usage metrics, health scores, peer benchmarks
            </p>
          </Link>
        </div>
      </div>
    </InternalLayout>
  );
}
