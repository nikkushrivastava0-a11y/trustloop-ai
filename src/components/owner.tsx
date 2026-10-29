"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, isDemo } from "@/lib/api";
import { useSession } from "./provider";
import type { Booking, BookingStatus, Resource } from "@/lib/types";
import { Shell } from "./shell";
import { Guard } from "./guard";
import { BookingCard } from "./bookings";
import { Icon } from "./icons";
export function Owner() {
  return (
    <Shell>
      <Guard role="owner">
        <OwnerWorkspace />
      </Guard>
    </Shell>
  );
}
function OwnerWorkspace() {
  const { user } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [tab, setTab] = useState("requests");
  const [showForm, setShowForm] = useState(false);
  const [queue, setQueue] = useState("pending");
  async function reload() {
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
  async function decide(id: string, status: BookingStatus) {
    setBusy(id);
    setError("");
    setMessage("");
    try {
      const updated = await api.updateStatus(id, status);
      setBookings((items) => items.map((b) => (b.id === id ? updated : b)));
      setMessage(
        `${id} ${status}. The student can track this update in booking history.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const ownedResources = isDemo ? resources : resources.filter((resource) => resource.owner_id === user?.id);
  const pending = bookings.filter((b) =>
    ["requested", "waitlisted"].includes(b.status),
  );
  const visible = queue === "pending" ? pending : bookings;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow green">MAKE CAMPUS POSSIBILITIES HAPPEN</div>
          <h1>A little access. A big impact.</h1>
          <p>
            Manage your resources and help the next great project get started.
          </p>
        </div>
        <button className="button" onClick={() => setShowForm(!showForm)}>
          <Icon name="plus" size={17} />
          {showForm ? "Close form" : "Add a resource"}
        </button>
      </div>
      <div className="stats-strip">
        <div>
          <span className="stat-icon">
            <Icon name="clock" />
          </span>
          <div>
            <strong>{pending.length}</strong>
            <span>Awaiting review</span>
          </div>
        </div>
        <div>
          <span className="stat-icon">
            <Icon name="check" />
          </span>
          <div>
            <strong>
              {bookings.filter((b) => b.status === "approved").length}
            </strong>
            <span>Approved bookings</span>
          </div>
        </div>
        <div>
          <span className="stat-icon">
            <Icon name="qr" />
          </span>
          <div>
            <strong>
              {bookings.filter((b) => b.status === "checked_out").length}
            </strong>
            <span>Out creating</span>
          </div>
        </div>
        <div>
          <span className="stat-icon">
            <Icon name="box" />
          </span>
          <div>
            <strong>{ownedResources.length}</strong>
            <span>Shared resources</span>
          </div>
        </div>
      </div>
      {showForm && (
        <AddResource
          onAdded={(r) => {
            setResources((all) => [...all, r]);
            setShowForm(false);
            setMessage(`${r.title} is now part of the campus collection.`);
          }}
        />
      )}
      <div className="table-toolbar">
        <div className="category-tabs">
          <button
            className={tab === "requests" ? "selected" : ""}
            onClick={() => setTab("requests")}
          >
            Booking requests
          </button>
          <button
            className={tab === "resources" ? "selected" : ""}
            onClick={() => setTab("resources")}
          >
            Your resources
          </button>
        </div>
        {tab === "requests" && (
          <label className="sort-select">
            Show{" "}
            <select
              value={queue}
              onChange={(e) => setQueue(e.target.value)}
              aria-label="Filter booking requests"
            >
              <option value="pending">Awaiting review</option>
              <option value="all">All bookings</option>
            </select>
          </label>
        )}
      </div>
      <div aria-live="polite">
        {message && <p className="success">{message}</p>}
      </div>
      {error && (
        <div className="error" role="alert">
          {error} <button onClick={() => void reload()}>Refresh data</button>
        </div>
      )}
      {loading ? (
        <div className="skeleton" />
      ) : tab === "resources" ? (
        <div className="stack">
          {ownedResources.map((r) => (
            <article className="panel" key={r.id}>
              <div className="booking-card-header">
                <div>
                  <div className="eyebrow">{r.category}</div>
                  <h3>{r.title}</h3>
                  <p>{r.location}</p>
                </div>
                <span className="status">
                  {r.available ? "Available" : "Unavailable"}
                </span>
              </div>
              <div className="action-row">
                <Link
                  href={`/resources/${r.id}`}
                  className="button secondary small"
                >
                  View resource <Icon name="arrow" size={14} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : !visible.length ? (
        <div className="empty-state">
          <Icon name="check" size={36} />
          <h2>You’re all caught up.</h2>
          <p>
            New requests will appear here when students book your resources.
          </p>
        </div>
      ) : (
        <div className="stack">
          {visible.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              resource={resources.find((r) => r.id === b.resource_id)}
            >
              <div className="action-row">
                {["requested", "waitlisted"].includes(b.status) && (
                  <>
                    <button
                      className="button small"
                      disabled={!!busy}
                      onClick={() => void decide(b.id, "approved")}
                    >
                      <Icon name="check" size={14} />
                      {busy === b.id ? "Updating…" : "Approve"}
                    </button>
                    {b.status === "requested" && (
                      <button
                        className="button secondary small"
                        disabled={!!busy}
                        onClick={() => void decide(b.id, "waitlisted")}
                      >
                        Waitlist
                      </button>
                    )}
                    <button
                      className="button danger small"
                      disabled={!!busy}
                      onClick={() => void decide(b.id, "rejected")}
                    >
                      Reject
                    </button>
                  </>
                )}
                {["approved", "checked_out"].includes(b.status) && (
                  <Link
                    href={`/bookings/${b.id}/handover`}
                    className="button small"
                  >
                    <Icon name="qr" size={14} />
                    Manage handover
                  </Link>
                )}
                <Link
                  href={`/bookings/${b.id}`}
                  className="button secondary small"
                >
                  View history
                </Link>
              </div>
            </BookingCard>
          ))}
        </div>
      )}
    </>
  );
}
function AddResource({ onAdded }: { onAdded: (r: Resource) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="panel"
      style={{ marginBottom: 25 }}
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          const r = await api.addResource({
            title: String(data.get("title")).trim(),
            category: String(data.get("category")),
            description: String(data.get("description")).trim(),
            location: String(data.get("location")).trim(),
            rules: String(data.get("rules"))
              .split("\n")
              .map((r) => r.trim())
              .filter(Boolean),
            requires_training: data.get("requires_training") === "on",
            available: data.get("available") === "on",
          });
          onAdded(r);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Open a new possibility.</h2>
      <p>Add the details students need to borrow responsibly.</p>
      <div className="field-row">
        <label className="field">
          Resource title
          <input
            name="title"
            required
            maxLength={120}
            placeholder="e.g. Canon EOS R6"
          />
        </label>
        <label className="field">
          Category
          <select name="category">
            {[
              "Photography",
              "Fabrication",
              "Electronics",
              "Presentation",
              "Audio",
              "Spaces",
              "Other",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        Description
        <textarea
          name="description"
          required
          minLength={10}
          maxLength={2000}
          placeholder="What’s included and what can students create?"
        />
      </label>
      <div className="field-row">
        <label className="field">
          Pickup location
          <input
            name="location"
            required
            maxLength={200}
            placeholder="Building and room"
          />
        </label>
        <label className="field">
          Rules · one per line
          <textarea
            name="rules"
            required
            maxLength={2000}
            placeholder="Bring your campus ID"
          />
        </label>
      </div>
      <div className="filter-checks">
        <label>
          <input name="requires_training" type="checkbox" /> Requires verified
          training
        </label>
        <label>
          <input name="available" type="checkbox" defaultChecked /> Available
          for requests
        </label>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button disabled={busy} className="button" style={{ marginTop: 20 }}>
        {busy ? "Adding…" : "Add resource"}
        <Icon name="plus" size={16} />
      </button>
    </form>
  );
}
