/**
 * Help Section Layout
 *
 * Layout wrapper for the help & support section.
 * Provides consistent padding and structure within the authenticated layout.
 */

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 md:px-6">
      {children}
    </div>
  );
}
