'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Award, Clock, BookOpen, Star, Lock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type TrackType = 'REQUIRED' | 'SPECIALTY' | 'ADVANCED';

interface Track {
  id: string;
  name: string;
  description: string;
  type: TrackType;
  coursesCount: number;
  estimatedHours: number;
  hasExam: boolean;
  enrolled: boolean;
  progressPercent: number;
  prerequisiteId?: string;
  prerequisiteName?: string;
  prerequisiteCompleted: boolean;
  version: string;
  majorVersion: number;
}

const trackTypeLabels: Record<TrackType, { label: string; color: string; bgColor: string }> = {
  REQUIRED: {
    label: 'Required',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  SPECIALTY: {
    label: 'Specialty',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  ADVANCED: {
    label: 'Advanced',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
};

export function CourseCatalog() {
  const queryClient = useQueryClient();

  const {
    data: tracks,
    isLoading,
    error,
  } = useQuery<Track[]>({
    queryKey: ['training-tracks'],
    queryFn: async () => {
      const res = await fetch('/api/v1/internal/training/tracks');
      if (!res.ok) {
        throw new Error('Failed to load training tracks');
      }
      return res.json();
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const res = await fetch(`/api/v1/internal/training/tracks/${trackId}/enroll`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Failed to enroll in track');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['my-training-progress'] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700">Failed to load training tracks</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['training-tracks'] })}
          className="mt-2 text-sm text-red-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Group by type per CONTEXT.md (Platform Fundamentals required, specialty optional)
  const requiredTracks = tracks?.filter((t) => t.type === 'REQUIRED') || [];
  const specialtyTracks = tracks?.filter((t) => t.type === 'SPECIALTY') || [];
  const advancedTracks = tracks?.filter((t) => t.type === 'ADVANCED') || [];

  const renderTrackCard = (track: Track) => {
    const typeConfig = trackTypeLabels[track.type];
    const hasPrereq = track.prerequisiteId && !track.prerequisiteCompleted;

    return (
      <div
        key={track.id}
        className={cn(
          'p-4 border rounded-lg transition-shadow',
          hasPrereq ? 'bg-gray-50 opacity-75' : 'bg-white hover:shadow-md'
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{track.name}</h3>
              {hasPrereq && <Lock className="h-4 w-4 text-gray-400" />}
            </div>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{track.description}</p>
          </div>
          <span className={cn('px-2 py-1 rounded text-xs flex-shrink-0', typeConfig.bgColor, typeConfig.color)}>
            {typeConfig.label}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {track.coursesCount} courses
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />~{track.estimatedHours}h
          </div>
          {track.hasExam && (
            <div className="flex items-center gap-1 text-amber-600">
              <Star className="h-4 w-4" />
              80% to pass
            </div>
          )}
        </div>

        <div className="text-xs text-gray-400 mb-3">Version {track.version}</div>

        {hasPrereq ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 p-2 bg-gray-100 rounded">
            <Lock className="h-4 w-4" />
            Complete "{track.prerequisiteName}" first
          </div>
        ) : track.enrolled ? (
          <Link
            href={`/training/${track.id}`}
            className="block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {track.progressPercent > 0 ? `Continue (${track.progressPercent}%)` : 'Start Learning'}
          </Link>
        ) : (
          <button
            onClick={() => enrollMutation.mutate(track.id)}
            disabled={enrollMutation.isPending}
            className={cn(
              'w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors',
              enrollMutation.isPending && 'opacity-50 cursor-not-allowed'
            )}
          >
            {enrollMutation.isPending ? 'Enrolling...' : 'Enroll'}
          </button>
        )}
      </div>
    );
  };

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    trackList: Track[],
    description?: string
  ) => {
    if (trackList.length === 0) return null;

    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
        <div className="grid grid-cols-2 gap-4">{trackList.map(renderTrackCard)}</div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Required tracks - Platform Fundamentals */}
      {renderSection(
        'Required Certifications',
        <Award className="h-5 w-5 text-red-500" />,
        requiredTracks,
        'Platform Fundamentals must be completed before specialty tracks'
      )}

      {/* Specialty tracks */}
      {renderSection(
        'Specialty Tracks',
        <Award className="h-5 w-5 text-blue-500" />,
        specialtyTracks,
        'Deep dives into specific platform capabilities'
      )}

      {/* Advanced tracks */}
      {renderSection(
        'Advanced Certifications',
        <Award className="h-5 w-5 text-purple-500" />,
        advancedTracks,
        'Expert-level training for power users'
      )}

      {/* Empty state */}
      {tracks?.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No training tracks available</p>
          <p className="text-sm mt-1">Check back later for new certification opportunities</p>
        </div>
      )}
    </div>
  );
}
