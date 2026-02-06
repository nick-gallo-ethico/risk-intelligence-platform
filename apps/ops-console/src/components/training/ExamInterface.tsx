'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Clock, CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExamInterfaceProps {
  trackId: string;
  onComplete: (passed: boolean) => void;
  onCancel: () => void;
}

interface Question {
  id: string;
  question: string;
  options: string[];
}

interface ExamData {
  trackName: string;
  questionCount: number;
  timeLimit: number; // in minutes
  attemptsRemaining: number;
  questions?: Question[];
}

interface ExamResult {
  passed: boolean;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passingScore: number;
  feedback?: Array<{
    questionId: string;
    correct: boolean;
    explanation?: string;
  }>;
}

interface SubmitAnswer {
  questionId: string;
  selectedIndex: number;
}

/**
 * Pass threshold per CONTEXT.md: 80% required to pass
 */
const PASSING_SCORE = 80;

export function ExamInterface({ trackId, onComplete, onCancel }: ExamInterfaceProps) {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load exam info (before starting)
  const { data: exam, isLoading: examLoading } = useQuery<ExamData>({
    queryKey: ['exam', trackId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/training/tracks/${trackId}/exam`);
      if (!res.ok) throw new Error('Failed to load exam');
      return res.json();
    },
    enabled: !started,
  });

  // Start exam mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/internal/training/tracks/${trackId}/exam/start`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to start exam');
      return res.json() as Promise<ExamData>;
    },
    onSuccess: (data) => {
      setTimeRemaining(data.timeLimit * 60);
      setStarted(true);
    },
  });

  // Submit exam mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const formattedAnswers: SubmitAnswer[] = Object.entries(answers).map(
        ([questionId, selectedIndex]) => ({
          questionId,
          selectedIndex,
        })
      );
      const res = await fetch(`/api/v1/internal/training/tracks/${trackId}/exam/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formattedAnswers }),
      });
      if (!res.ok) throw new Error('Failed to submit exam');
      return res.json() as Promise<ExamResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    },
  });

  // Timer effect
  useEffect(() => {
    if (!started || timeRemaining <= 0 || result) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - auto submit
          submitMutation.mutate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [started, result]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = useCallback((questionId: string, index: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
  }, []);

  const handleSubmit = () => {
    const questions = startMutation.data?.questions || [];
    const answeredCount = Object.keys(answers).length;
    const unansweredCount = questions.length - answeredCount;

    if (unansweredCount > 0) {
      setShowConfirmSubmit(true);
    } else {
      submitMutation.mutate();
    }
  };

  const confirmSubmit = () => {
    setShowConfirmSubmit(false);
    submitMutation.mutate();
  };

  // Loading state
  if (examLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Not started - show exam info
  if (!started && !result) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white border rounded-lg p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold">{exam?.trackName} Certification Exam</h1>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{exam?.questionCount}</div>
              <div className="text-sm text-gray-500">Questions</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{exam?.timeLimit}m</div>
              <div className="text-sm text-gray-500">Time Limit</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{PASSING_SCORE}%</div>
              <div className="text-sm text-gray-500">To Pass</div>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
            <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
              <AlertTriangle className="h-5 w-5" />
              Before You Begin
            </div>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>
                - You have <strong>{exam?.attemptsRemaining}</strong> attempt
                {(exam?.attemptsRemaining ?? 0) !== 1 ? 's' : ''} remaining
              </li>
              <li>- Timer starts immediately when you click "Start Exam"</li>
              <li>- You cannot pause once started</li>
              <li>- Exam auto-submits when time runs out</li>
              <li>
                - <strong>{PASSING_SCORE}%</strong> score required to pass (per CONTEXT.md)
              </li>
            </ul>
          </div>

          {(exam?.attemptsRemaining ?? 0) <= 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                You have no attempts remaining. Please contact training support.
              </p>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <button
              onClick={onCancel}
              className="px-6 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending || (exam?.attemptsRemaining ?? 0) <= 0}
              className={cn(
                'px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2',
                (startMutation.isPending || (exam?.attemptsRemaining ?? 0) <= 0) &&
                  'opacity-50 cursor-not-allowed'
              )}
            >
              {startMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                'Start Exam'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show result
  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div
          className={cn(
            'border rounded-lg p-8 text-center space-y-6',
            result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          )}
        >
          <div className="flex justify-center">
            {result.passed ? (
              <CheckCircle className="h-16 w-16 text-green-600" />
            ) : (
              <XCircle className="h-16 w-16 text-red-600" />
            )}
          </div>

          <h1 className="text-2xl font-bold">
            {result.passed ? 'Congratulations! You Passed!' : 'Exam Not Passed'}
          </h1>

          <div className="text-5xl font-bold">
            <span className={result.passed ? 'text-green-600' : 'text-red-600'}>
              {result.score}%
            </span>
          </div>

          <p className="text-gray-600">
            {result.correctCount} of {result.totalQuestions} questions correct
            {!result.passed && ` (${result.passingScore}% required)`}
          </p>

          {result.passed && (
            <div className="p-4 bg-green-100 rounded-lg">
              <p className="text-green-800">
                Your certificate has been generated and is ready for download!
              </p>
            </div>
          )}

          {!result.passed && (
            <div className="p-4 bg-red-100 rounded-lg text-left">
              <p className="text-red-800 font-medium mb-2">Areas to review:</p>
              <ul className="text-sm text-red-700 space-y-1">
                {result.feedback
                  ?.filter((f) => !f.correct)
                  .slice(0, 5)
                  .map((f) => (
                    <li key={f.questionId}>- {f.explanation || 'Review this topic'}</li>
                  ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => onComplete(result.passed)}
            className={cn(
              'px-6 py-3 rounded-lg text-white transition-colors',
              result.passed ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {result.passed ? 'View Certificate' : 'Return to Course'}
          </button>
        </div>
      </div>
    );
  }

  // Exam in progress
  const questions = startMutation.data?.questions || [];
  const question = questions[currentIndex];
  const isLowTime = timeRemaining < 60;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Confirm submit dialog */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-semibold mb-2">Submit with unanswered questions?</h3>
            <p className="text-gray-600 mb-4">
              You have {questions.length - answeredCount} unanswered question
              {questions.length - answeredCount !== 1 ? 's' : ''}. Are you sure you want to submit?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Keep Working
              </button>
              <button
                onClick={confirmSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with timer */}
      <div className="flex items-center justify-between p-4 bg-white border rounded-lg">
        <div>
          <span className="font-medium">Question {currentIndex + 1}</span>
          <span className="text-gray-500"> of {questions.length}</span>
        </div>
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            isLowTime ? 'bg-red-100 text-red-700' : 'bg-gray-100'
          )}
        >
          <Clock className={cn('h-5 w-5', isLowTime && 'animate-pulse')} />
          <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
        </div>
      </div>

      {/* Question */}
      {question && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-medium mb-6">{question.question}</h2>

          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(question.id, idx)}
                className={cn(
                  'w-full p-4 border rounded-lg text-left transition-colors flex items-start gap-3',
                  answers[question.id] === idx
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                )}
              >
                <span
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    answers[question.id] === idx
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  )}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="pt-1">{option}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="px-4 py-2 border rounded-lg disabled:opacity-50 flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="text-sm text-gray-500">
          {answeredCount}/{questions.length} answered
        </div>

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className={cn(
              'px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2',
              submitMutation.isPending && 'opacity-50 cursor-not-allowed'
            )}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Exam'
            )}
          </button>
        )}
      </div>

      {/* Question navigator */}
      <div className="p-4 bg-white border rounded-lg">
        <p className="text-sm text-gray-500 mb-3">Jump to question:</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'w-10 h-10 rounded-lg text-sm font-medium transition-colors',
                currentIndex === idx
                  ? 'bg-blue-600 text-white'
                  : answers[q.id] !== undefined
                  ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                  : 'bg-white border hover:bg-gray-50'
              )}
            >
              {idx + 1}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            Current
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            Answered
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-white border rounded"></div>
            Unanswered
          </div>
        </div>
      </div>
    </div>
  );
}
