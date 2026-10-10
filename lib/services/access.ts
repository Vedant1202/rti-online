import type { User } from "@/lib/auth/rbac";
import type { RequestRow } from "./requests";
import { forbidden } from "@/lib/http";

/** Who can see a request: its citizen, officers of its authority, and admins. */
export function canView(user: User, req: Pick<RequestRow, "citizenId" | "authorityId">): boolean {
  if (user.role === "admin") return true;
  if (user.role === "citizen") return req.citizenId === user.id;
  return user.authorityId === req.authorityId;
}

export function assertCanView(user: User, req: Pick<RequestRow, "citizenId" | "authorityId">) {
  if (!canView(user, req)) throw forbidden();
}
