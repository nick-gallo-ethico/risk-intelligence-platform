import { redirect } from "next/navigation";

/**
 * Profile Page
 *
 * Redirects to /settings/profile for user profile management.
 *
 * This uses Next.js server-side redirect for immediate navigation.
 */
export default function ProfilePage() {
  redirect("/settings/profile");
}
