'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CourseCatalog } from '@/components/training/CourseCatalog';
import { Award, BookOpen, Clock, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'catalog' | 'progress' | 'certificates';

interface TrackProgress {
  id: string;
  name: string;
  status: string;
  completedCourses: number;
  totalCourses: number;
  progressPercent: number;
}

interface Certificate {
  id: string;
  trackId: string;
  trackName: string;
  earnedAt: string;
  expiresAt?: string;
  isExpired: boolean;
  pdfUrl: string;
}

interface MyProgressData {
  tracks: TrackProgress[];
  totalHours: number;
}

export default function TrainingPortalPage() {
  const [activeTab, setActiveTab] = useState<TabType>('catalog');

  const { data: myProgress } = useQuery<MyProgressData>({
    queryKey: ['my-training-progress'],
    queryFn: async () => {
      const res = await fetch('/api/v1/internal/training/progress/me');
      if (!res.ok) {
        return { tracks: [], totalHours: 0 };
      }
      return res.json();
    },
  });

  const { data: myCertificates } = useQuery<Certificate[]>({
    queryKey: ['my-certificates'],
    queryFn: async () => {
      const res = await fetch('/api/v1/internal/training/certificates/me');
      if (!res.ok) {
        return [];
      }
      return res.json();
    },
  });

  const completedTracks = myProgress?.tracks?.filter((t) => t.status === 'COMPLETED').length || 0;
  const inProgressTracks = myProgress?.tracks?.filter((t) => t.status === 'IN_PROGRESS').length || 0;
  const totalCertificates = myCertificates?.length || 0;
  const expiredCertificates = myCertificates?.filter((c) => c.isExpired).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Training Portal</h1>
        <p className="text-gray-500">Complete certifications to become an Ethico expert</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white border rounded-lg">
          <BookOpen className="h-5 w-5 text-blue-500 mb-2" />
          <div className="text-2xl font-bold">{inProgressTracks}</div>
          <div className="text-sm text-gray-500">In Progress</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-500 mb-2" />
          <div className="text-2xl font-bold">{completedTracks}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <Award className="h-5 w-5 text-yellow-500 mb-2" />
          <div className="text-2xl font-bold">{totalCertificates}</div>
          <div className="text-sm text-gray-500">Certificates</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <Clock className="h-5 w-5 text-gray-500 mb-2" />
          <div className="text-2xl font-bold">{myProgress?.totalHours || 0}h</div>
          <div className="text-sm text-gray-500">Learning Time</div>
        </div>
      </div>

      {/* Expiration Warning */}
      {expiredCertificates > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="text-yellow-800 font-medium">
              {expiredCertificates} certificate{expiredCertificates > 1 ? 's have' : ' has'} expired
            </p>
            <p className="text-yellow-700 text-sm">
              Major version changes require re-certification. View the certificates tab to retake.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {[
            { key: 'catalog', label: 'Course Catalog', icon: BookOpen },
            { key: 'progress', label: 'My Progress', icon: Clock },
            { key: 'certificates', label: 'Certificates', icon: Award },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 border-b-2 -mb-px',
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'catalog' && <CourseCatalog />}

      {activeTab === 'progress' && (
        <div className="space-y-4">
          {!myProgress?.tracks || myProgress.tracks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No tracks in progress</p>
              <p className="text-sm mt-1">Browse the catalog to get started!</p>
            </div>
          ) : (
            myProgress.tracks.map((track) => (
              <Link
                key={track.id}
                href={`/training/${track.id}`}
                className="block p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{track.name}</h3>
                    <p className="text-sm text-gray-500">
                      {track.completedCourses}/{track.totalCourses} courses complete
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${track.progressPercent}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">
                      {track.progressPercent}%
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {activeTab === 'certificates' && (
        <div className="space-y-4">
          {!myCertificates || myCertificates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No certificates yet</p>
              <p className="text-sm mt-1">Complete a certification track to earn certificates!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {myCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className={cn(
                    'p-4 border rounded-lg',
                    cert.isExpired ? 'bg-red-50 border-red-200' : 'bg-white'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{cert.trackName}</h3>
                      <p className="text-sm text-gray-500">
                        Earned: {new Date(cert.earnedAt).toLocaleDateString()}
                      </p>
                      {cert.expiresAt && (
                        <p
                          className={cn(
                            'text-sm',
                            cert.isExpired ? 'text-red-600' : 'text-gray-500'
                          )}
                        >
                          {cert.isExpired ? 'Expired: ' : 'Expires: '}
                          {new Date(cert.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {!cert.isExpired && (
                      <a
                        href={cert.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-100 rounded"
                        title="Download certificate"
                      >
                        <FileText className="h-5 w-5 text-blue-500" />
                      </a>
                    )}
                  </div>
                  {cert.isExpired && (
                    <Link
                      href={`/training/${cert.trackId}`}
                      className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                    >
                      Retake certification
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
