"use client";
import Link from "next/link";
import { useSession } from "./provider";
import type { Role } from "@/lib/types";
export function Guard({
  role,
  children,
}: {
  role?: Role;
  children: React.ReactNode;
}) {
  const { user, loading } = useSession();
  if (loading)
    return <div className="skeleton" aria-label="Checking session" />;
  if (!user)
    return (
      <div className="empty-state">
        <h2>Step into the loop.</h2>
        <p>Log in to manage your campus bookings.</p>
        <Link href="/login" className="button">
          Log in
        </Link>
      </div>
    );
  if (role && user.role !== role)
    return (
      <div className="empty-state">
        <h2>
          {role === "owner"
            ? "Resource owner access required"
            : "Student access required"}
        </h2>
        <p>
          Your current account is signed in as a {user.role}. Switch accounts to
          continue.
        </p>
        <Link href="/login" className="button secondary">
          Switch account
        </Link>
      </div>
    );
  return <>{children}</>;
}
