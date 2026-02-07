import { redirect } from "next/navigation";

/**
 * Profile Page
 *
 * Redirects to /settings since there is no dedicated profile page.
 * The settings page contains user profile management.
 *
 * This uses Next.js server-side redirect for immediate navigation.
 */
export default function ProfilePage() {
  redirect("/settings");
}
