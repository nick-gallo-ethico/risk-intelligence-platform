import { InternalLayout } from '@/components/layouts/InternalLayout';

export default function ImplementationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InternalLayout>{children}</InternalLayout>;
}
