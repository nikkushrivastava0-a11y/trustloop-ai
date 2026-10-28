"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icons";
import { useSession } from "./provider";
import { api, isDemo } from "@/lib/api";
export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark">∞</span>TrustLoop
      <span className="ai">AI</span>
    </Link>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, loading, error, refresh } = useSession();
  const router = useRouter();
  const [logoutError, setLogoutError] = useState("");
  const links = [
    ["/student", "grid", "Discover resources"],
    ["/bookings", "clock", "My bookings"],
    ["/owner", "box", "Owner workspace"],
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">CAMPUS WORKSPACE</div>
        <nav aria-label="Main navigation">
          {links.map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={path.startsWith(href) ? "page" : undefined}
              className={`nav-link ${path.startsWith(href) ? "active" : ""}`}
            >
              <Icon name={icon} />
              {label}
              {path.startsWith(href) && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="community-card">
            <span className="mini-icon">
              <Icon name="users" />
            </span>
            <strong>More access. Less ownership.</strong>
            <p>Great ideas start with shared resources.</p>
            <Link href="/student">
              Find your next tool <Icon name="arrow" size={15} />
            </Link>
          </div>
          {isDemo && (
            <div className="demo-label">
              <span /> Interactive demo · local data
            </div>
          )}
          <div className="profile">
            <span className="avatar">{user?.name.slice(0, 1) || "G"}</span>
            <div>
              <strong>{user?.name || "Campus explorer"}</strong>
              <small>
                {loading
                  ? "Connecting…"
                  : user?.role === "owner"
                    ? "Resource owner"
                    : user
                      ? "Student member"
                      : "Guest access"}
              </small>
            </div>
            {user ? (
              <button
                className="icon-button"
                title="Sign out"
                aria-label="Sign out"
                onClick={async () => {
                  try {
                    await api.logout();
                    await refresh();
                    router.push("/login");
                  } catch (e) {
                    setLogoutError((e as Error).message);
                  }
                }}
              >
                <Icon name="logout" size={18} />
              </button>
            ) : (
              <Link href="/login" className="text-link">
                Log in
              </Link>
            )}
          </div>
          {logoutError && (
            <p role="alert" className="error">
              {logoutError}
            </p>
          )}
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {path.startsWith("/owner")
                ? "Owner workspace"
                : path.startsWith("/bookings")
                  ? "My bookings"
                  : "Discover"}
            </strong>
          </span>
          <div className="top-actions">
            <span className="campus-pill">
              <span /> Campus network
            </span>
            <Link
              href="/bookings"
              aria-label="View booking updates"
              className="icon-button"
            >
              <Icon name="bell" />
            </Link>
            <span className="avatar small">
              {user?.name.slice(0, 1) || "G"}
            </span>
          </div>
        </header>
        <main id="main-content" className="content">
          {isDemo && (
            <p className="notice demo-notice" role="status">
              Demo mode · local browser data and simulated accounts.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}{" "}
              <button onClick={() => void refresh()}>Retry connection</button>
            </p>
          )}
          {children}
        </main>
        <footer className="app-footer">
          <span>TrustLoop AI</span>
          <span>Built for a campus that shares.</span>
          <span>
            <Icon name="shield" size={14} /> Verified community
          </span>
        </footer>
      </div>
    </div>
  );
}
