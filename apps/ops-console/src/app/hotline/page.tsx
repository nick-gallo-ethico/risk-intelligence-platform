import Link from 'next/link';
import { FileText, ListChecks, Users } from 'lucide-react';

export default function HotlineOpsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hotline Operations</h1>

      <div className="grid grid-cols-3 gap-6">
        <Link
          href="/hotline/qa-queue"
          className="p-6 bg-white border rounded-lg hover:shadow-md transition-shadow"
        >
          <ListChecks className="h-8 w-8 text-blue-500 mb-3" />
          <h2 className="text-lg font-semibold">QA Queue</h2>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve RIUs across all clients
          </p>
        </Link>

        <Link
          href="/hotline/directives"
          className="p-6 bg-white border rounded-lg hover:shadow-md transition-shadow"
        >
          <FileText className="h-8 w-8 text-green-500 mb-3" />
          <h2 className="text-lg font-semibold">Directives</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage client-specific operator scripts
          </p>
        </Link>

        <Link
          href="/hotline/operators"
          className="p-6 bg-white border rounded-lg hover:shadow-md transition-shadow"
        >
          <Users className="h-8 w-8 text-purple-500 mb-3" />
          <h2 className="text-lg font-semibold">Operator Status</h2>
          <p className="text-sm text-gray-500 mt-1">Live operator availability board</p>
        </Link>
      </div>
    </div>
  );
}
