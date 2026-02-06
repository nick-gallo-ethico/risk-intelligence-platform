import { Clock, BookOpen, Award, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CertificationProgressProps {
  progress?: {
    completedCourses: number;
    totalCourses: number;
    progressPercent: number;
    allCoursesComplete: boolean;
    examPassed: boolean;
    examScore?: number;
    status: string;
    totalTimeSpent: number;
    isExpired?: boolean;
  };
  track?: {
    coursesCount: number;
    estimatedHours: number;
    hasExam: boolean;
  };
}

export function CertificationProgress({ progress, track }: CertificationProgressProps) {
  if (!progress || !track) return null;

  // Build the step indicators based on track configuration
  const steps = [
    {
      label: 'Courses',
      complete: progress.allCoursesComplete,
      description: `${progress.completedCourses}/${progress.totalCourses} complete`,
    },
    ...(track.hasExam
      ? [
          {
            label: 'Exam (80%)',
            complete: progress.examPassed,
            description: progress.examScore !== undefined ? `Score: ${progress.examScore}%` : 'Not attempted',
          },
        ]
      : []),
    {
      label: 'Certified',
      complete: progress.status === 'COMPLETED' && !progress.isExpired,
      description: progress.status === 'COMPLETED' && !progress.isExpired ? 'Achieved!' : 'Pending',
    },
  ];

  // Calculate time in hours and minutes
  const totalMinutes = Math.round(progress.totalTimeSpent / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="bg-white border rounded-lg p-6 space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">
            {progress.completedCourses}/{progress.totalCourses}
          </div>
          <div className="text-sm text-gray-500">Courses</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold">{progress.progressPercent}%</div>
          <div className="text-sm text-gray-500">Progress</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold">{timeDisplay}</div>
          <div className="text-sm text-gray-500">Time Spent</div>
        </div>

        {track.hasExam && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Award
                className={cn(
                  'h-4 w-4',
                  progress.examPassed ? 'text-green-500' : 'text-gray-400'
                )}
              />
            </div>
            <div
              className={cn(
                'text-2xl font-bold',
                progress.examScore !== undefined
                  ? progress.examPassed
                    ? 'text-green-600'
                    : 'text-red-600'
                  : 'text-gray-400'
              )}
            >
              {progress.examScore !== undefined ? `${progress.examScore}%` : '--'}
            </div>
            <div className="text-sm text-gray-500">Exam Score</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Overall Progress</span>
          <span className="font-medium">{progress.progressPercent}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out',
              progress.status === 'COMPLETED' && !progress.isExpired
                ? 'bg-green-500'
                : 'bg-blue-500'
            )}
            style={{ width: `${progress.progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progress.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between relative">
        {/* Connecting lines */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10">
          <div
            className={cn(
              'h-full bg-green-500 transition-all duration-500',
              progress.status === 'COMPLETED' && !progress.isExpired
                ? 'w-full'
                : progress.examPassed || (progress.allCoursesComplete && !track.hasExam)
                ? 'w-2/3'
                : progress.allCoursesComplete
                ? 'w-1/3'
                : 'w-0'
            )}
          />
        </div>

        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-col items-center z-10">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                step.complete ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              )}
            >
              {step.complete ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <span className="font-medium text-sm">{i + 1}</span>
              )}
            </div>
            <span
              className={cn(
                'mt-2 text-sm font-medium',
                step.complete ? 'text-green-600' : 'text-gray-500'
              )}
            >
              {step.label}
            </span>
            <span className="text-xs text-gray-400 mt-0.5">{step.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
