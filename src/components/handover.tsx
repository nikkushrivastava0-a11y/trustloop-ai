"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api, isDemo } from "@/lib/api";
import type { Booking, ConditionReport, Resource } from "@/lib/types";
import { Shell } from "./shell";
import { Guard } from "./guard";
import { BookingCard } from "./bookings";
import { Icon } from "./icons";
function BookingQR({ value }: { value: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (ref.current)
      QRCode.toCanvas(ref.current, value, {
        width: 220,
        margin: 3,
        color: { dark: "#244e3d", light: "#ffffff" },
      }).catch(() =>
        setError("QR could not be rendered. Use the booking code below."),
      );
  }, [value]);
  return (
    <div className="qr-wrap">
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <canvas
          ref={ref}
          role="img"
          aria-label={`QR code for booking ${value}`}
        />
      )}
    </div>
  );
}
export function Handover({ id, incident }: { id: string; incident: boolean }) {
  return (
    <Shell>
      <Guard>
        <HandoverForm id={id} incident={incident} />
      </Guard>
    </Shell>
  );
}
function HandoverForm({ id, incident }: { id: string; incident: boolean }) {
  const [booking, setBooking] = useState<Booking>();
  const [resource, setResource] = useState<Resource>();
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([api.bookings(), api.resources()])
      .then(([b, r]) => {
        if (active) {
          const current = b.find((item) => item.id === id);
          setBooking(current);
          setResource(r.find((item) => item.id === current?.resource_id));
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
  }, [id]);
  const kind: ConditionReport["kind"] = incident
    ? "incident"
    : booking?.status === "approved"
      ? "checkout"
      : "return";
  const allowed =
    incident || ["approved", "checked_out"].includes(booking?.status || "");
  return (
    <>
      <Link href={`/bookings/${id}`} className="back-link">
        ← Back to booking history
      </Link>
      <div className="page-title">
        <div className="eyebrow green">
          SHARED WITH TRUST. RETURNED WITH CARE.
        </div>
        <h1>
          {incident
            ? "Let’s keep things transparent."
            : kind === "checkout"
              ? "Ready for your next idea?"
              : "Close the loop with care."}
        </h1>
        <p>
          {incident
            ? "Record an issue so the resource owner can follow up."
            : "Verify your booking and record the equipment condition at handover."}
        </p>
      </div>
      {loading ? (
        <div className="skeleton" />
      ) : !booking ? (
        <div className="empty-state">
          <h2>Booking not found</h2>
          <p>{error || "Check your account and booking ID."}</p>
        </div>
      ) : done ? (
        <div className="empty-state">
          <Icon name="check" size={42} />
          <h2>
            {kind === "incident"
              ? "Incident report submitted"
              : kind === "checkout"
                ? "Check-out confirmed"
                : "Return confirmed"}
          </h2>
          <p>
            {isDemo
              ? "Demo updated locally. Photo filenames are saved; image bytes are not persisted."
              : "Your report and booking update have been submitted."}
          </p>
          <Link href={`/bookings/${id}`} className="button">
            View updated timeline <Icon name="arrow" size={16} />
          </Link>
        </div>
      ) : (
        <div className="detail-grid">
          <div className="stack">
            <BookingCard booking={booking} resource={resource} />
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
                      "This booking is not ready for a handover.",
                    );
                  if (!incident && !photos.length)
                    throw new Error("Add at least one condition photo.");
                  if (
                    photos.some(
                      (f) =>
                        !f.type.startsWith("image/") ||
                        f.size > 5 * 1024 * 1024,
                    )
                  )
                    throw new Error("Choose image files under 5 MB each.");
                  await api.report(id, kind, notes, photos, code);
                  setDone(true);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>{incident ? "Incident details" : "Equipment condition"}</h2>
              <p>
                {incident
                  ? "Describe what happened and attach supporting photos."
                  : "Note any existing marks, missing accessories or damage before confirming."}
              </p>
              {!allowed && (
                <p className="notice" style={{ marginTop: 16 }}>
                  Handovers require an approved or checked-out booking.
                </p>
              )}
              {!incident && (
                <label className="field">
                  Booking / handover code
                  <input
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter the code from the QR"
                    autoComplete="off"
                  />
                  <small>
                    Scan with your phone’s QR reader, then enter the booking
                    code shown.
                  </small>
                </label>
              )}
              <label className="field">
                {incident ? "What happened?" : "Condition notes"}
                <textarea
                  required
                  minLength={5}
                  maxLength={2000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    incident
                      ? "Describe the issue, when it happened and what needs attention…"
                      : "e.g. Camera and lens in good condition. Both batteries and case included."
                  }
                />
              </label>
              <label className="field">
                {incident
                  ? "Supporting photos (optional)"
                  : "Condition photos (required)"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  required={!incident}
                  onChange={(e) => setPhotos(Array.from(e.target.files || []))}
                />
                <small>
                  Images only · up to 5 MB each.{" "}
                  {isDemo
                    ? "Demo records filenames only; API mode uploads the original files."
                    : ""}
                </small>
              </label>
              {photos.length > 0 && (
                <div className="photo-list">
                  Selected: {photos.map((f) => f.name).join(", ")}
                </div>
              )}
              <label className="filter-checks" style={{ margin: "20px 0" }}>
                <input
                  type="checkbox"
                  required
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                {incident
                  ? "I confirm this report is accurate."
                  : kind === "checkout"
                    ? "I confirm the equipment has been handed over."
                    : "I confirm the equipment and accessories have been returned."}
              </label>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button full"
                disabled={busy || !confirmed || !allowed}
              >
                {busy
                  ? "Submitting…"
                  : incident
                    ? "Submit incident report"
                    : kind === "checkout"
                      ? "Confirm check-out"
                      : "Confirm return"}
                <Icon name="check" size={16} />
              </button>
            </form>
          </div>
          <aside className="panel booking-panel">
            <h2>
              {incident ? "Keep the loop informed." : "Your handover pass"}
            </h2>
            <p>
              {incident
                ? "Your report becomes part of the booking history. The resource owner can review it and arrange next steps."
                : "Show this QR to the resource owner at pickup or return."}
            </p>
            {!incident && (
              <>
                <BookingQR value={id} />
                <div style={{ textAlign: "center" }}>
                  <div className="eyebrow">BOOKING CODE</div>
                  <strong>{id}</strong>
                </div>
                <div className="notice" style={{ marginTop: 20 }}>
                  Bring your campus ID and show this pass to the resource owner.
                  Confirm the equipment condition together before completing the
                  handover.
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
