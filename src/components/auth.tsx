"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, isDemo } from "@/lib/api";
import type { Role } from "@/lib/types";
import { Brand } from "./shell";
import { Icon } from "./icons";
import { useSession } from "./provider";
export function Auth({ mode }: { mode: "login" | "signup" }) {
  const [role, setRole] = useState<Role>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { refresh } = useSession();
  const router = useRouter();
  return (
    <main className="auth-wrap" id="main-content">
      <section className="auth-story">
        <Brand />
        <div>
          <h1>
            A little trust.
            <br />A world of possibilities.
          </h1>
          <p>
            The tools you need are closer than you think. Join a campus
            community that shares, creates and grows together.
          </p>
        </div>
        <div className="auth-quote">
          <Icon name="shield" size={24} />
          <p>
            Shared with trust.
            <br />
            Returned with care.
          </p>
        </div>
      </section>
      <section className="auth-form-wrap">
        <form
          className="auth-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api.authenticate(mode, { name, email, password, role });
              await refresh();
              router.push(role === "student" ? "/student" : "/owner");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="eyebrow green">WELCOME TO THE LOOP</div>
          <h1>
            {mode === "login"
              ? "Good to have you back."
              : "Your ideas belong here."}
          </h1>
          <p>
            {mode === "login"
              ? "Log in and pick up where your curiosity left off."
              : "Create an account and unlock your campus possibilities."}
          </p>
          <div className="role-switch" aria-label="Account role">
            <button
              type="button"
              className={role === "student" ? "selected" : ""}
              aria-pressed={role === "student"}
              onClick={() => setRole("student")}
            >
              <Icon
                name="users"
                style={{ display: "inline", marginRight: 8 }}
                size={17}
              />
              Student
            </button>
            <button
              type="button"
              className={role === "owner" ? "selected" : ""}
              aria-pressed={role === "owner"}
              onClick={() => setRole("owner")}
            >
              <Icon
                name="box"
                style={{ display: "inline", marginRight: 8 }}
                size={17}
              />
              Resource owner
            </button>
          </div>
          {mode === "signup" && (
            <label className="field">
              Full name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Your name"
                maxLength={100}
              />
            </label>
          )}
          <label className="field">
            Campus email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@university.edu"
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 8 characters"
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button disabled={busy} className="button full">
            {busy
              ? "Connecting…"
              : mode === "login"
                ? "Log in to TrustLoop"
                : "Create your account"}
            <Icon name="arrow" size={16} />
          </button>
          <div className="auth-foot">
            {mode === "login"
              ? "New to the loop?"
              : "Already part of the loop?"}{" "}
            <Link
              className="text-link"
              href={mode === "login" ? "/signup" : "/login"}
            >
              {mode === "login" ? "Create an account" : "Log in"}
            </Link>
          </div>
          {isDemo && (
            <p className="auth-demo">
              Demo mode: use any email and an 8-character password. Roles
              simulate separate sessions; this is not production authentication.
              Passwords are never stored.
            </p>
          )}
          <div className="auth-foot">
            <Link href="/student">← Explore as a guest</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
