'use client';

import {
  Sparkles,
  Zap,
  MessageSquare,
  FileSearch,
  PenLine,
  Languages,
  ClipboardList,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAiPanel } from '@/contexts/ai-panel-context';
import { cn } from '@/lib/utils';

/**
 * Quick action item definition
 */
interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: typeof Sparkles;
}

/**
 * Context-aware quick actions
 * These will be dynamically populated based on the current page
 * For now, showing general-purpose actions as placeholders
 */
const quickActions: QuickAction[] = [
  {
    id: 'summarize',
    label: 'Summarize',
    description: 'Generate a summary of current content',
    icon: FileSearch,
  },
  {
    id: 'draft',
    label: 'Draft Response',
    description: 'AI-assisted response drafting',
    icon: PenLine,
  },
  {
    id: 'translate',
    label: 'Translate',
    description: 'Translate content to another language',
    icon: Languages,
  },
  {
    id: 'checklist',
    label: 'Generate Checklist',
    description: 'Create a checklist from requirements',
    icon: ClipboardList,
  },
];

/**
 * QuickActionButton
 *
 * Individual quick action button with icon and description
 */
function QuickActionButton({
  action,
  onClick,
}: {
  action: QuickAction;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 w-full p-3 rounded-lg text-left',
        'hover:bg-accent transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
      )}
    >
      <div className="flex-shrink-0 h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
        <action.icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{action.label}</p>
        <p className="text-xs text-muted-foreground">{action.description}</p>
      </div>
    </button>
  );
}

/**
 * AiPanel
 *
 * Slide-over panel for AI Assistant functionality.
 * Opens from the right side of the screen.
 *
 * Contains:
 * - Header with title
 * - Quick Actions section (context-aware, placeholder for now)
 * - Chat section (placeholder for future implementation)
 */
export function AiPanel() {
  const { isOpen, setIsOpen } = useAiPanel();

  const handleQuickAction = (actionId: string) => {
    // Placeholder - will be implemented with actual AI functionality
    console.log('Quick action triggered:', actionId);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        side="right"
        className="w-[400px] max-w-full flex flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Assistant
          </SheetTitle>
          <SheetDescription>
            Get AI-powered help with your compliance tasks
          </SheetDescription>
        </SheetHeader>

        {/* Quick Actions */}
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Quick Actions</h3>
          </div>
          <div className="space-y-1">
            {quickActions.map((action) => (
              <QuickActionButton
                key={action.id}
                action={action}
                onClick={() => handleQuickAction(action.id)}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Chat Section - Placeholder */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Chat</h3>
          </div>

          {/* Chat placeholder */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              AI Chat Coming Soon
            </p>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              Ask questions about cases, policies, or get help with compliance
              tasks.
            </p>
          </div>

          {/* Chat input placeholder */}
          <div className="mt-4 flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Ask AI anything..."
                disabled
                className={cn(
                  'w-full h-10 px-4 pr-12 rounded-full',
                  'bg-muted/50 border border-input',
                  'text-sm placeholder:text-muted-foreground',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
              <Button
                size="icon"
                variant="ghost"
                disabled
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
              >
                <Sparkles className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Chat interface is under development
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
