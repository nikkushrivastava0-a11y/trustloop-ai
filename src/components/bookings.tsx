"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/domain";
import { useCurrentTime } from "@/lib/use-current-time";
import {
  bookingStatuses,
  type Booking,
  type BookingStatus,
  type Resource,
} from "@/lib/types";
import { Shell } from "./shell";
import { Guard } from "./guard";
import { Icon } from "./icons";
export function Status({ status }: { status: BookingStatus }) {
  return (
    <span className={`status ${status}`}>{status.replaceAll("_", " ")}</span>
  );
}
export function BookingCard({
  booking,
  resource,
  children,
}: {
  booking: Booking;
  resource?: Resource;
  children?: React.ReactNode;
}) {
  const now = useCurrentTime();
  return (
    <article className="panel">
      <div className="booking-card-header">
        <div>
          <div className="eyebrow">{booking.id}</div>
          <h3 style={{ marginTop: 5 }}>
            {resource?.title || "Campus resource"}
          </h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <Status status={booking.status} />
          {booking.status === "checked_out" && new Date(booking.ends_at).getTime() < now && (
            <span className="status rejected" role="status">Overdue · owner follow-up needed</span>
          )}
        </div>
      </div>
      <div className="booking-meta">
        <span>
          <Icon name="clock" size={14} />
          {formatDate(booking.starts_at)} → {formatDate(booking.ends_at)}
        </span>
        <span>
          <Icon name="pin" size={14} />
          {resource?.location || "Campus pickup"}
        </span>
        {booking.student_name && (
          <span>
            <Icon name="users" size={14} />
            {booking.student_name}
          </span>
        )}
      </div>
      <p className="booking-purpose">{booking.purpose}</p>
      {children}
    </article>
  );
}
export function Bookings() {
  return (
    <Shell>
      <Guard>
        <BookingList />
      </Guard>
    </Shell>
  );
}
function BookingList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>({});
  const [statusNotice, setStatusNotice] = useState("");
  const previousStatuses = useRef<Record<string, BookingStatus> | null>(null);
  async function load() {
    setLoading(true);
    try {
      const [b, r] = await Promise.all([api.bookings(), api.resources()]);
      setBookings(b);
      setResources(r);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    let fetching = false;
    async function refresh() {
      if (!active || fetching || document.hidden) return;
      fetching = true;
      try {
        const [b, r] = await Promise.all([api.bookings(), api.resources()]);
        if (active) {
          const old = previousStatuses.current;
          if (old) {
            const change = b.find(item => old[item.id] && old[item.id] !== item.status);
            if (change) setStatusNotice(`Booking ${change.id}: status changed to ${change.status.replaceAll("_", " ")}. Open the timeline for details.`);
          }
          previousStatuses.current = Object.fromEntries(b.map(item => [item.id, item.status]));
          setBookings(b);
          setResources(r);
          setError("");
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        fetching = false;
        if (active) setLoading(false);
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 12000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const visible = bookings.filter(
    (b) => filter === "all" || b.status === filter,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow green">EVERY PROJECT HAS A STORY</div>
          <h1>Your booking journey.</h1>
          <p>Requests, handovers and everything in between.</p>
        </div>
        <Link href="/student" className="button secondary">
          Find a resource <Icon name="arrow" size={16} />
        </Link>
      </div>
      <div className="table-toolbar">
        <div className="category-tabs">
          {["all", ...bookingStatuses].map((s) => (
            <button
              key={s}
              className={filter === s ? "selected" : ""}
              aria-pressed={filter === s}
              onClick={() => setFilter(s)}
            >
              {s.replaceAll("_", " ")}
            </button>
          ))}
        </div>
        <span className="count-label">{visible.length} bookings</span>
      </div>
      {statusNotice && <div className="notice" role="status" aria-live="polite">
        {statusNotice} <button type="button" className="button secondary small" onClick={() => setStatusNotice("")}>Dismiss</button>
      </div>}
      {error && (
        <div className="error" role="alert">
          {error} <button onClick={() => void load()}>Retry</button>
        </div>
      )}
      {loading ? (
        <div className="skeleton" />
      ) : !visible.length ? (
        <div className="empty-state">
          <Icon name="clock" size={35} />
          <h2>Your next project is waiting.</h2>
          <p>
            {filter === "all"
              ? "Book your first campus resource to get started."
              : "No bookings with this status yet."}
          </p>
          <Link href="/student" className="button">
            Discover resources
          </Link>
        </div>
      ) : (
        <div className="stack">
          {visible.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              resource={resources.find((r) => r.id === b.resource_id)}
            >
              {["requested", "waitlisted", "approved"].includes(b.status) && (
                <label className="field" style={{marginTop: 12}}>
                  Cancellation reason (optional, recorded in history)
                  <input maxLength={500} value={cancelReasons[b.id] || ""}
                    onChange={e=>setCancelReasons(previous=>({...previous,[b.id]:e.target.value}))}
                    placeholder="e.g. Project date changed" />
                </label>
              )}
              <div className="action-row">
                <Link
                  href={`/bookings/${b.id}`}
                  className="button secondary small"
                >
                  View timeline <Icon name="arrow" size={14} />
                </Link>
                {["approved", "checked_out"].includes(b.status) && (
                  <Link
                    href={`/bookings/${b.id}/handover`}
                    className="button small"
                  >
                    <Icon name="qr" size={15} />
                    {b.status === "approved" ? "Check out" : "Return resource"}
                  </Link>
                )}
                {["requested", "waitlisted", "approved"].includes(b.status) && (
                  <button
                    className="button secondary small"
                    disabled={!!busy}
                    onClick={async () => {
                      setBusy(b.id);
                      setError("");
                      try {
                        const updated = await api.updateStatus(
                          b.id,
                          "cancelled",
                          cancelReasons[b.id]?.trim(),
                        );
                        setBookings((all) =>
                          all.map((item) =>
                            item.id === b.id ? updated : item,
                          ),
                        );
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy("");
                      }
                    }}
                  >
                    {busy === b.id ? "Cancelling…" : "Cancel request"}
                  </button>
                )}
              </div>
            </BookingCard>
          ))}
        </div>
      )}
    </>
  );
}
