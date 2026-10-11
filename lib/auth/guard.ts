import { redirect } from "next/navigation";
import type { Role } from "@/lib/contract";
import { getCurrentUser, homeFor, type User } from "./rbac";

/** For pages: redirect to sign-in when signed out, or to the user's own home for the wrong role. */
export async function requirePageUser(path: string, roles?: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (roles && !roles.includes(user.role) && user.role !== "admin") redirect(homeFor(user.role));
  return user;
}
