import type { Role } from "@/lib/contract";
import { forbidden } from "@/lib/http";
import type { User } from "@/lib/auth/rbac";

/** The user must hold this role at this authority (admins may act anywhere). */
export function assertOfficer(user: User, role: Role, authorityId: string) {
  if (user.role === "admin") return;
  if (user.role !== role || user.authorityId !== authorityId) throw forbidden();
}
