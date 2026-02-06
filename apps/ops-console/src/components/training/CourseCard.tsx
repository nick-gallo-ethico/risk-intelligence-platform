'use client';

import { CheckCircle, Lock, Play, FileText, Clock, Video, BookOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: {
    id: string;
    name: string;
    description: string;
    estimatedMinutes: number;
    contentType: 'VIDEO' | 'ARTICLE' | 'INTERACTIVE';
    contentUrl?: string;
  };
  progress?: {
    completed: boolean;
    startedAt?: string;
    completedAt?: string;
    timeSpent: number;
  };
  index: number;
  isLocked: boolean;
  onComplete: () => void;
  isCompleting?: boolean;
}

const contentTypeIcons = {
  VIDEO: Video,
  ARTICLE: FileText,
  INTERACTIVE: BookOpen,
};

const contentTypeLabels = {
  VIDEO: 'Video',
  ARTICLE: 'Article',
  INTERACTIVE: 'Interactive',
};

export function CourseCard({
  course,
  progress,
  index,
  isLocked,
  onComplete,
  isCompleting = false,
}: CourseCardProps) {
  const isCompleted = progress?.completed;
  const isStarted = !!progress?.startedAt;
  const ContentIcon = contentTypeIcons[course.contentType] || FileText;

  // Format time spent
  const timeSpentMinutes = progress?.timeSpent ? Math.round(progress.timeSpent / 60) : 0;
  const timeSpentDisplay =
    timeSpentMinutes > 0
      ? timeSpentMinutes >= 60
        ? `${Math.floor(timeSpentMinutes / 60)}h ${timeSpentMinutes % 60}m`
        : `${timeSpentMinutes}m`
      : null;

  return (
    <div
      className={cn(
        'p-4 border rounded-lg transition-all',
        isCompleted
          ? 'bg-green-50 border-green-200'
          : isLocked
          ? 'bg-gray-50 opacity-60'
          : 'bg-white hover:shadow-md'
      )}
    >
      <div className="flex items-center gap-4">
        {/* Status icon */}
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
            isCompleted
              ? 'bg-green-500 text-white'
              : isLocked
              ? 'bg-gray-300 text-gray-500'
              : isStarted
              ? 'bg-blue-500 text-white'
              : 'bg-blue-100 text-blue-600'
          )}
        >
          {isCompleted ? (
            <CheckCircle className="h-5 w-5" />
          ) : isLocked ? (
            <Lock className="h-5 w-5" />
          ) : (
            <span className="font-medium">{index}</span>
          )}
        </div>

        {/* Course info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{course.name}</h3>
          <p className="text-sm text-gray-500 line-clamp-1">{course.description}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {course.estimatedMinutes} min
            </span>
            <span className="flex items-center gap-1">
              <ContentIcon className="h-3 w-3" />
              {contentTypeLabels[course.contentType]}
            </span>
            {timeSpentDisplay && (
              <span className="text-blue-500">{timeSpentDisplay} spent</span>
            )}
            {isCompleted && progress?.completedAt && (
              <span className="text-green-600">
                Completed {new Date(progress.completedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isLocked && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isCompleted && course.contentUrl && (
              <a
                href={course.contentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={`Open ${contentTypeLabels[course.contentType].toLowerCase()}`}
              >
                <Play className="h-5 w-5 text-blue-500" />
              </a>
            )}
            {!isCompleted && (
              <button
                onClick={onComplete}
                disabled={isCompleting}
                className={cn(
                  'px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2',
                  isCompleting && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Mark Complete'
                )}
              </button>
            )}
            {isCompleted && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Completed
              </span>
            )}
          </div>
        )}

        {/* Locked state message */}
        {isLocked && (
          <div className="flex items-center gap-2 text-sm text-gray-500 flex-shrink-0">
            <Lock className="h-4 w-4" />
            Complete previous course first
          </div>
        )}
      </div>
    </div>
  );
}
