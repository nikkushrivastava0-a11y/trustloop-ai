"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api, isDemo } from "@/lib/api";
import { realApi } from "@/lib/real-api";
import { useSession } from "./provider";
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
          aria-label="Private student handover pass QR code"
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
  const { user } = useSession();
  const [handoverPass, setHandoverPass] = useState("");
  const [passError, setPassError] = useState("");
  const [booking, setBooking] = useState<Booking>();
  const [resource, setResource] = useState<Resource>();
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [incidentKind, setIncidentKind] = useState<"damage" | "delay" | "conflict" | "other">("damage");
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
  const isRequester = !!user && booking?.student_id === user.id;
  useEffect(() => {
    if (incident || !booking || !isRequester || !["approved","checked_out"].includes(booking.status)) return;
    if (isDemo) {
      setHandoverPass(id);
      return;
    }
    let active = true;
    realApi.handoverPass(id).then((pass) => {
      if (active) setHandoverPass(pass);
    }).catch((e: Error) => {
      if (active) setPassError(e.message);
    });
    return () => { active = false; };
  }, [booking, id, incident, isRequester]);
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
            {(incident || !isRequester || isDemo) ? (
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
                  if (isDemo && !incident && !photos.length)
                    throw new Error("Add at least one condition photo.");
                  if (
                    photos.some(
                      (f) =>
                        !f.type.startsWith("image/") ||
                        f.size > 5 * 1024 * 1024,
                    )
                  )
                    throw new Error("Choose image files under 5 MB each.");
                  await api.report(id, kind, notes, photos, code, incidentKind);
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
                  ? "Choose an issue type and describe what happened. The report will be recorded in the booking history."
                  : "Note any existing marks, missing accessories or damage before confirming."}
              </p>
              {isRequester && !incident && !isDemo && (
                <p className="notice" style={{ marginTop: 16 }}>Your secure handover pass is shown on the right. The resource owner completes checkout and return confirmation with you.</p>
              )}
              {!allowed && (
                <p className="notice" style={{ marginTop: 16 }}>
                  Handovers require an approved or checked-out booking.
                </p>
              )}
              {!incident && (
                <label className="field">
                  Student handover pass
                  <input
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter the code from the QR"
                    autoComplete="off"
                  />
                  <small>
                    Ask the student to show their handover pass. Only the resource owner can confirm this handover.
                  </small>
                </label>
              )}
              {incident && <label className="field">Issue category
                <select value={incidentKind} onChange={e => setIncidentKind(e.target.value as "damage" | "delay" | "conflict" | "other")}>
                  <option value="damage">Damage or missing parts</option>
                  <option value="delay">Late return</option>
                  <option value="conflict">Booking or access conflict</option>
                  <option value="other">Other concern</option>
                </select>
              </label>}
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
              {(!incident || isDemo) && <label className="field">
                {incident
                  ? "Supporting photos (demo filenames only)"
                  : "Condition photo (optional in live mode)"}
                <input
                  type="file"
                  accept="image/*"
                  required={isDemo && !incident}
                  onChange={(e) => setPhotos(Array.from(e.target.files || []))}
                />
                <small>
                  {isDemo ? "Demo records filenames only." : "Live handovers store one private JPEG, PNG or WebP image (maximum 5 MB). Incident photos are not supported."}
                </small>
              </label>}
              {!isDemo && !incident && <p className="notice">Condition photos are stored privately and shared with booking parties through temporary signed links.</p>}
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
                disabled={busy || !confirmed || !allowed || (isRequester && !incident && !isDemo)}
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
            ) : (
              <section className="panel" aria-label="Student handover instructions">
                <h2>Your handover pass is ready</h2>
                <p>Show the QR code and private pass on the right to the resource owner. The owner will record the equipment condition and confirm checkout or return.</p>
                <p className="notice" style={{ marginTop: 16 }}>Checkout is completed by the resource owner, not from the student account. Keep this page open while the owner confirms.</p>
                <Link href={`/bookings/${id}`} className="button secondary" style={{ marginTop: 16 }}>View booking timeline</Link>
              </section>
            )}
          </div>
          <aside className="panel booking-panel">
            <h2>
              {incident ? "Keep the loop informed." : isRequester ? "Your handover pass" : "Owner verification"}
            </h2>
            <p>
              {incident
                ? "Your report becomes part of the booking history. The resource owner can review it and arrange next steps."
                : "Show this QR to the resource owner at pickup or return."}
            </p>
            {!incident && (
              <>
                {isRequester && handoverPass ? (
                  <>
                    <BookingQR value={handoverPass} />
                    <div style={{ textAlign: "center", overflowWrap: "anywhere" }}>
                      <div className="eyebrow">STUDENT HANDOVER PASS</div>
                      <strong>{handoverPass}</strong>
                    </div>
                    <p className="notice">Share this one-booking pass with the resource owner at physical pickup or return. Do not send it publicly.</p>
                  </>
                ) : isRequester ? (
                  <p className="notice" role="status">{passError || "Loading your secure handover pass…"}</p>
                ) : (
                  <p className="notice">Only the student can display the secure QR pass. Ask them to show their pass, then enter that code in the owner confirmation form.</p>
                )}
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
