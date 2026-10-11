import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth/rbac";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  const user = await getCurrentUser();
  if (user) redirect(typeof next === "string" ? next : homeFor(user.role));
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </div>
  );
}
