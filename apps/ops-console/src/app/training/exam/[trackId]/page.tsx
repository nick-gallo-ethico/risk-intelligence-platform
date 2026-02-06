'use client';

import { useParams, useRouter } from 'next/navigation';
import { ExamInterface } from '@/components/training/ExamInterface';

export default function ExamPage() {
  const { trackId } = useParams();
  const router = useRouter();

  const handleComplete = (passed: boolean) => {
    if (passed) {
      // Redirect to track page to see certificate
      router.push(`/training/${trackId}?certified=true`);
    } else {
      // Stay on track page to see attempts remaining
      router.push(`/training/${trackId}`);
    }
  };

  const handleCancel = () => {
    router.push(`/training/${trackId}`);
  };

  if (!trackId || typeof trackId !== 'string') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ExamInterface trackId={trackId} onComplete={handleComplete} onCancel={handleCancel} />
    </div>
  );
}
