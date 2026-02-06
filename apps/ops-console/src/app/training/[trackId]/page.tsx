'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CertificationProgress } from '@/components/training/CertificationProgress';
import { CourseCard } from '@/components/training/CourseCard';
import {
  ArrowLeft,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Course {
  id: string;
  name: string;
  description: string;
  estimatedMinutes: number;
  contentType: 'VIDEO' | 'ARTICLE' | 'INTERACTIVE';
  contentUrl?: string;
  order: number;
}

interface CourseProgress {
  courseId: string;
  completed: boolean;
  startedAt?: string;
  completedAt?: string;
  timeSpent: number;
}

interface TrackData {
  id: string;
  name: string;
  description: string;
  type: string;
  version: string;
  majorVersion: number;
  coursesCount: number;
  estimatedHours: number;
  hasExam: boolean;
  courses: Course[];
}

interface ProgressData {
  completedCourses: number;
  totalCourses: number;
  progressPercent: number;
  allCoursesComplete: boolean;
  examPassed: boolean;
  examScore?: number;
  examAttemptsRemaining?: number;
  status: string;
  totalTimeSpent: number;
  courses: CourseProgress[];
  certificateUrl?: string;
  completedAt?: string;
  completedVersion?: string;
  isExpired?: boolean;
}

export default function TrackDetailPage() {
  const { trackId } = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [showCertifiedToast, setShowCertifiedToast] = useState(false);

  // Check for certified=true query param (redirect from exam)
  useEffect(() => {
    if (searchParams?.get('certified') === 'true') {
      setShowCertifiedToast(true);
      // Clear the query param
      window.history.replaceState({}, '', `/training/${trackId}`);
      setTimeout(() => setShowCertifiedToast(false), 5000);
    }
  }, [searchParams, trackId]);

  const {
    data: track,
    isLoading: trackLoading,
    error: trackError,
  } = useQuery<TrackData>({
    queryKey: ['training-track', trackId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/training/tracks/${trackId}`);
      if (!res.ok) throw new Error('Failed to load track');
      return res.json();
    },
  });

  const { data: progress, isLoading: progressLoading } = useQuery<ProgressData>({
    queryKey: ['track-progress', trackId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/training/tracks/${trackId}/progress`);
      if (!res.ok) throw new Error('Failed to load progress');
      return res.json();
    },
  });

  const completeCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await fetch(`/api/v1/internal/training/courses/${courseId}/complete`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to mark course complete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-progress', trackId] });
      queryClient.invalidateQueries({ queryKey: ['my-training-progress'] });
    },
  });

  if (trackLoading || progressLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (trackError || !track) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700">Failed to load training track</p>
        <Link href="/training" className="mt-2 text-sm text-blue-600 hover:underline">
          Back to Training Portal
        </Link>
      </div>
    );
  }

  // Sort courses by order
  const sortedCourses = [...(track.courses || [])].sort((a, b) => a.order - b.order);

  // Determine if courses should be locked (sequential completion)
  const getIsLocked = (index: number): boolean => {
    if (index === 0) return false;
    const previousCourse = sortedCourses[index - 1];
    const previousProgress = progress?.courses?.find((c) => c.courseId === previousCourse.id);
    return !previousProgress?.completed;
  };

  return (
    <div className="space-y-6">
      {/* Certified toast */}
      {showCertifiedToast && (
        <div className="fixed top-4 right-4 p-4 bg-green-100 border border-green-300 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-right">
          <Award className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Congratulations!</p>
            <p className="text-sm text-green-700">You are now certified</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/training"
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label="Back to Training Portal"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{track.name}</h1>
          <p className="text-gray-500">{track.description}</p>
          <p className="text-xs text-gray-400 mt-1">Version {track.version}</p>
        </div>
        {progress?.status === 'COMPLETED' && !progress?.isExpired && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            Certified
          </div>
        )}
        {progress?.isExpired && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg">
            <RefreshCw className="h-5 w-5" />
            Re-certification Required
          </div>
        )}
      </div>

      {/* Expiration notice */}
      {progress?.isExpired && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-medium">
              Your certification from version {progress.completedVersion} has expired
            </p>
            <p className="text-amber-700 text-sm mt-1">
              Major platform changes require re-certification. Complete all courses and pass the
              exam again to renew your certificate.
            </p>
          </div>
        </div>
      )}

      {/* Progress */}
      <CertificationProgress progress={progress} track={track} />

      {/* Course list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Courses</h2>
        {sortedCourses.length === 0 ? (
          <p className="text-gray-500 p-4 bg-gray-50 rounded-lg">
            No courses available in this track yet.
          </p>
        ) : (
          sortedCourses.map((course, index) => {
            const courseProgress = progress?.courses?.find((c) => c.courseId === course.id);
            const isLocked = getIsLocked(index);

            return (
              <CourseCard
                key={course.id}
                course={course}
                progress={courseProgress}
                index={index + 1}
                isLocked={isLocked}
                onComplete={() => completeCourse.mutate(course.id)}
                isCompleting={completeCourse.isPending}
              />
            );
          })
        )}
      </div>

      {/* Final exam */}
      {track.hasExam && progress?.allCoursesComplete && !progress?.examPassed && (
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Final Certification Exam</h3>
              <p className="text-sm text-gray-600 mt-1">
                80% required to pass. You have{' '}
                <span className="font-medium">{progress?.examAttemptsRemaining ?? 3}</span> attempt
                {(progress?.examAttemptsRemaining ?? 3) !== 1 ? 's' : ''} remaining.
              </p>
              {progress?.examScore !== undefined && (
                <p className="text-sm text-red-600 mt-1">
                  Previous attempt: {progress.examScore}% (did not pass)
                </p>
              )}
            </div>
            <Link
              href={`/training/exam/${trackId}`}
              className={cn(
                'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors',
                (progress?.examAttemptsRemaining ?? 3) <= 0 && 'opacity-50 pointer-events-none'
              )}
            >
              Start Exam
            </Link>
          </div>
        </div>
      )}

      {/* No attempts remaining */}
      {track.hasExam &&
        progress?.allCoursesComplete &&
        !progress?.examPassed &&
        (progress?.examAttemptsRemaining ?? 3) <= 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">
              You have no exam attempts remaining. Please contact training support for assistance.
            </p>
          </div>
        )}

      {/* Certificate download */}
      {progress?.certificateUrl && !progress?.isExpired && (
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold">Certification Complete!</h3>
                <p className="text-sm text-gray-600">
                  Earned on{' '}
                  {progress.completedAt
                    ? new Date(progress.completedAt).toLocaleDateString()
                    : 'Unknown date'}
                </p>
              </div>
            </div>
            <a
              href={progress.certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Download Certificate
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
