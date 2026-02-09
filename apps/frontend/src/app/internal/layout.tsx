'use client';

/**
 * Internal Operations Layout
 * Wraps all internal operations modules with common layout
 */

import { InternalLayout } from '@/components/layouts/InternalLayout';

export default function RootInternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InternalLayout>{children}</InternalLayout>;
}
