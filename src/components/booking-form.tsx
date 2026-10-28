"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { eligible } from "@/lib/domain";
import type { Resource } from "@/lib/types";
import { Shell } from "./shell";
import { Guard } from "./guard";
import { useSession } from "./provider";
import { ResourceArt } from "./resources";
import { Icon } from "./icons";
export function BookingForm({ resourceId }: { resourceId: string }) {
  return (
    <Shell>
      <Guard role="student">
        <BookingFields resourceId={resourceId} />
      </Guard>
    </Shell>
  );
}
function BookingFields({ resourceId }: { resourceId: string }) {
  const { user } = useSession();
  const [resource, setResource] = useState<Resource>();
  const [loading, setLoading] = useState(true);
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [purpose, setPurpose] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");
  useEffect(() => {
    let active = true;
    api
      .resources()
      .then((all) => {
        if (active) {
          setResource(all.find((r) => r.id === resourceId));
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [resourceId]);
  if (loading) return <div className="skeleton" />;
  if (!resource)
    return (
      <div className="empty-state">
        <h2>Choose a resource first</h2>
        <p>
          {error || "Explore the campus collection to find your next tool."}
        </p>
        <Link href="/student" className="button">
          Browse resources
        </Link>
      </div>
    );
  if (bookingId)
    return (
      <div className="empty-state">
        <Icon name="check" size={42} />
        <div className="eyebrow green">YOU’RE IN THE LOOP</div>
        <h1 style={{ marginTop: 12 }}>Request sent.</h1>
        <p>
          The resource owner will review your booking for {resource.title}.
          <br />
          Your status is <strong>requested</strong>. We’ll keep the next steps
          in your booking history.
        </p>
        <Link href={`/bookings/${bookingId}`} className="button">
          Track your request <Icon name="arrow" size={17} />
        </Link>
      </div>
    );
  const allowed = eligible(resource, user) && resource.available;
  return (
    <>
      <Link href={`/resources/${resource.id}`} className="back-link">
        ← Back to {resource.title}
      </Link>
      <div className="page-title">
        <div className="eyebrow green">FROM WHAT IF TO WHAT’S NEXT</div>
        <h1>Make it happen.</h1>
        <p>A few details, and your next project is one step closer.</p>
      </div>
      <div className="detail-grid">
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              if (!allowed)
                throw new Error(
                  "This resource is unavailable or requires verified training.",
                );
              if (
                Date.parse(starts) <= Date.now() ||
                Date.parse(ends) <= Date.parse(starts)
              )
                throw new Error(
                  "Choose a future start time and an end time after it.",
                );
              if (purpose.trim().length < 10)
                throw new Error(
                  "Tell us about your project in at least 10 characters.",
                );
              const b = await api.createBooking({
                resource_id: resource.id,
                starts_at: new Date(starts).toISOString(),
                ends_at: new Date(ends).toISOString(),
                purpose,
              });
              setBookingId(b.id);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Your booking details</h2>
          <p>
            Times use your device’s local timezone. Requests are subject to
            owner approval.
          </p>
          <div className="field-row">
            <label className="field">
              Start date & time
              <input
                required
                type="datetime-local"
                value={starts}
                onChange={(e) => setStarts(e.target.value)}
              />
            </label>
            <label className="field">
              End date & time
              <input
                required
                type="datetime-local"
                value={ends}
                min={starts}
                onChange={(e) => setEnds(e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            What are you working on?
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Tell the owner about your project and how you’ll use this resource…"
            />
            <small>
              A little context helps the owner review your request fairly.
            </small>
          </label>
          <div className={allowed ? "success" : "notice"}>
            <Icon
              name="shield"
              size={17}
              style={{ display: "inline", marginRight: 8 }}
            />
            {!resource.available
              ? "This equipment is currently unavailable."
              : eligible(resource, user)
                ? "You meet the current booking requirements."
                : "Training verification is required. Contact the owner before booking."}
          </div>
          <ul className="rules-list">
            {resource.rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <label
            className="filter-checks"
            style={{ margin: "20px 0", alignItems: "start" }}
          >
            <input
              type="checkbox"
              required
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />{" "}
            I’ve read the rules and will return the resource with care.
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button
            className="button full"
            disabled={busy || !allowed || !accepted}
          >
            {busy ? "Sending your request…" : "Send booking request"}
            <Icon name="arrow" size={16} />
          </button>
        </form>
        <aside>
          <ResourceArt resource={resource} large />
          <div className="panel">
            <div className="eyebrow">{resource.category}</div>
            <h2 style={{ marginTop: 8 }}>{resource.title}</h2>
            <p className="location">
              <Icon name="pin" size={15} />
              {resource.location}
            </p>
            <div className="bottom-note">
              <Icon name="clock" />
              <p>Your booking is confirmed only after owner approval.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
