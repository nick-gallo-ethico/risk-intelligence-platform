/**
 * Icon mapping for activity types in the timeline
 */

import {
  PlusCircle,
  Edit,
  ArrowRight,
  UserPlus,
  MessageSquare,
  Paperclip,
  Eye,
  Download,
  Check,
  X,
  Bot,
  RefreshCw,
  UserMinus,
  type LucideIcon,
} from 'lucide-react';
import type { ActivityAction } from '@/types/activity';

export interface ActivityIconConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

const iconConfigs: Record<ActivityAction, ActivityIconConfig> = {
  created: {
    icon: PlusCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  updated: {
    icon: Edit,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  status_changed: {
    icon: ArrowRight,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  assigned: {
    icon: UserPlus,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  unassigned: {
    icon: UserMinus,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  commented: {
    icon: MessageSquare,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
  file_uploaded: {
    icon: Paperclip,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  viewed: {
    icon: Eye,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  exported: {
    icon: Download,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
  approved: {
    icon: Check,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  rejected: {
    icon: X,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  ai_generated: {
    icon: Bot,
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
  },
  synced: {
    icon: RefreshCw,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
  },
};

const defaultConfig: ActivityIconConfig = {
  icon: Edit,
  color: 'text-gray-600',
  bgColor: 'bg-gray-100',
};

export function getActivityIconConfig(action: string): ActivityIconConfig {
  return iconConfigs[action as ActivityAction] || defaultConfig;
}
