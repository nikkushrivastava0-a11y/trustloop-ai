"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, isDemo } from "@/lib/api";
import { formatDate } from "@/lib/domain";
import type {
  Booking,
  BookingEvent,
  ConditionReport,
  Resource,
} from "@/lib/types";
import { Shell } from "./shell";
import { Guard } from "./guard";
import { BookingCard, Status } from "./bookings";
import { Icon } from "./icons";
import { useSession } from "./provider";
export function BookingHistory({ id }: { id: string }) {
  return (
    <Shell>
      <Guard>
        <History id={id} />
      </Guard>
    </Shell>
  );
}
function History({ id }: { id: string }) {
  const { user } = useSession();
  const [resolutions, setResolutions] = useState<Record<string,string>>({});
  const [resolutionBusy, setResolutionBusy] = useState("");
  const [resolutionError, setResolutionError] = useState("");
  const [booking, setBooking] = useState<Booking>();
  const [resource, setResource] = useState<Resource>();
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [reports, setReports] = useState<ConditionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let fetching = false;
    async function refresh() {
      if (!active || fetching || document.hidden) return;
      fetching = true;
      try {
        const [b, r, h] = await Promise.all([api.bookings(), api.resources(), api.history(id)]);
        if (!active) return;
        const current = b.find((item) => item.id === id);
        setBooking(current);
        setResource(r.find((item) => item.id === current?.resource_id));
        setEvents(h.events);
        setReports(h.reports);
        setError("");
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
  }, [id]);
  return (
    <>
      <Link href="/bookings" className="back-link">
        ← Back to bookings
      </Link>
      <div className="page-title">
        <div className="eyebrow green">EVERY STEP, IN THE LOOP</div>
        <h1>Your project’s paper trail.</h1>
        <p>A clear record of requests, decisions and responsible handovers.</p>
      </div>
      {error ? (
        <div className="error" role="alert">
          {error}
        </div>
      ) : loading ? (
        <div className="skeleton" />
      ) : !booking ? (
        <div className="empty-state">
          <h2>Booking not found</h2>
          <p>This booking isn’t available to your current account.</p>
        </div>
      ) : (
        <div className="detail-grid">
          <div className="stack">
            <BookingCard booking={booking} resource={resource}>
              <div className="action-row">
                {["approved", "checked_out"].includes(booking.status) && (
                  <Link
                    href={`/bookings/${id}/handover`}
                    className="button small"
                  >
                    <Icon name="qr" size={15} />
                    {booking.status === "approved"
                      ? "Check out resource"
                      : "Confirm return"}
                  </Link>
                )}
                <Link
                  href={`/bookings/${id}/handover?kind=incident`}
                  className="button secondary small"
                >
                  Report an incident
                </Link>
              </div>
            </BookingCard>
            <section className="panel">
              <h2>Activity timeline</h2>
              <p>Updates from your booking journey.</p>
              <div className="timeline">
                {events.map((e) => (
                  <div className="timeline-item" key={e.id}>
                    <small>{formatDate(e.at)}</small>
                    {e.action === "incident_reported" || e.action === "incident_resolved" ? <span className="status">{e.action === "incident_reported" ? "Incident reported" : "Incident resolved"}</span> : <Status status={e.status} />}
                    <p>{e.note}</p>
                  </div>
                ))}
                {!events.length && (
                  <p>No timeline updates have been returned yet.</p>
                )}
              </div>
            </section>
          </div>
          <aside className="panel">
            <h2>Condition & incident reports</h2>
            <p>Care is part of the borrowing experience.</p>
            {resolutionError && <p role="alert" className="error">{resolutionError}</p>}
            {reports.length ? (
              reports.map((r) => (
                <article className="report-card" key={r.id}>
                  <div className="eyebrow">
                    {r.kind} · {formatDate(r.created_at)}
                  </div>
                  <p>{r.notes}</p>
                  {r.kind === "incident" && r.resolution && <p className="notice"><strong>Owner resolution:</strong> {r.resolution}</p>}
                  {r.kind === "incident" && !r.resolution && (isDemo ? user?.role === "owner" : resource?.owner_id === user?.id) && <div className="field" style={{ marginTop: 12 }}>
                    <label htmlFor={`resolution-${r.id}`}>Owner resolution / next steps</label>
                    <textarea id={`resolution-${r.id}`} minLength={5} maxLength={2000} value={resolutions[r.id] || ""} onChange={e => setResolutions(v => ({...v,[r.id]:e.target.value}))} placeholder="Describe the action taken, agreement or next steps." />
                    <button type="button" className="button secondary small" disabled={!!resolutionBusy || (resolutions[r.id] || "").trim().length < 5} onClick={async () => {
                      setResolutionBusy(r.id); setResolutionError("");
                      try { await api.resolveIncident(r.id, (resolutions[r.id] || "").trim()); window.location.reload(); }
                      catch (e) { setResolutionError(e instanceof Error ? e.message : "Resolution failed"); }
                      finally { setResolutionBusy(""); }
                    }}>{resolutionBusy === r.id ? "Saving…" : "Record resolution"}</button>
                  </div>}
                  {r.photo_names.length > 0 && (
                    <div className="photo-list">
                      {isDemo ? (
                        <>Photo names recorded in demo: {r.photo_names.join(", ")}</>
                      ) : (
                        r.photo_names.map((url, index) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-link" style={{ display: "block" }}>
                            View private condition photo {index + 1}
                          </a>
                        ))
                      )}
                    </div>
                  )}
                </article>
              ))
            ) : (
              <p style={{ marginTop: 20 }}>
                No reports yet. Condition notes will appear here after the
                handover.
              </p>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
