import { ComponentType } from "react";

/**
 * Pipeline stage configuration for record workflows.
 * Represents a single stage in a pipeline (e.g., New, Active, Closed).
 */
export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
  isClosed: boolean;
  allowedTransitions: string[];
  description?: string;
}

/**
 * Pipeline configuration for a module type.
 * Defines the stages and transitions for cases, investigations, or disclosures.
 */
export interface PipelineConfig {
  id: string;
  tenantId?: string;
  moduleType: "cases" | "investigations" | "disclosures";
  name: string;
  stages: PipelineStage[];
  isDefault: boolean;
}

/**
 * Tab configuration for the center column tabbed interface.
 */
export interface TabConfig {
  id: string;
  label: string;
  component: ComponentType<any>;
  isDefault?: boolean;
}

/**
 * Sidebar card configuration for left or right sidebars.
 */
export interface SidebarCardConfig {
  id: string;
  type?: string;
  label?: string;
  collapsedByDefault?: boolean;
  component?: ComponentType<any>;
  props?: Record<string, any>;
}

/**
 * Config-driven record detail page configuration.
 * This object defines the entire structure of a record detail page:
 * - Pipeline stages and transitions
 * - Tab configuration for center column
 * - Left and right sidebar card configuration
 * - Quick actions and menu actions
 * - Activity types to display
 * - Data highlights for the info summary
 */
export interface RecordDetailConfig {
  moduleType: string;
  primaryDisplayProperty: string;
  statusProperty: string;
  severityProperty: string;
  pipeline: {
    enabled: boolean;
    configEndpoint?: string;
    defaultStages: PipelineStage[];
  };
  tabs: TabConfig[];
  leftSidebar: {
    cards: SidebarCardConfig[];
  };
  rightSidebar: {
    cards: SidebarCardConfig[];
  };
  quickActions: string[];
  actionsMenu: string[];
  activityTypes: string[];
  dataHighlights: string[];
}
