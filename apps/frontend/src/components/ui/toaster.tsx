'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toast notification container using Sonner.
 * Add this component to your root layout to enable toast notifications.
 */
export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-gray-500',
          actionButton:
            'group-[.toast]:bg-gray-900 group-[.toast]:text-white',
          cancelButton:
            'group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500',
          success: 'group-[.toaster]:border-green-500',
          error: 'group-[.toaster]:border-red-500',
        },
      }}
      {...props}
    />
  );
}

// Re-export toast function for convenience
export { toast } from 'sonner';
