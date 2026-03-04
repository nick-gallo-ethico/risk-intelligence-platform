/**
 * Chatbot component exports
 *
 * Main components:
 * - ChatbotWidget: Full chatbot widget with FAB, panel, and consent
 * - ChatbotPanel: Chat interface with messages and input
 * - ChatbotLauncher: Floating action button
 * - ConsentDialog: GDPR consent dialog for anonymous users
 */

// Main widget (use this in layouts)
export { ChatbotWidget } from "./chatbot-widget";
export type { ChatbotWidgetProps } from "./chatbot-widget";

// Sub-components (for custom implementations)
export { ChatbotPanel } from "./chatbot-panel";
export type { ChatbotPanelProps } from "./chatbot-panel";

export { ChatbotLauncher } from "./chatbot-launcher";
export type { ChatbotLauncherProps } from "./chatbot-launcher";

export { ConsentDialog } from "./consent-dialog";
export type { ConsentDialogProps } from "./consent-dialog";
