export const bookingStatuses = ['requested', 'approved', 'rejected', 'waitlisted', 'checked_out', 'returned', 'cancelled'] as const;
export type BookingStatus = typeof bookingStatuses[number];
export type Role = 'student' | 'owner';
export interface User { id: string; name: string; email: string; role: Role; trained_resource_ids: string[] }
export interface Resource { id: string; title: string; category: string; description: string; location: string; rules: string[]; requires_training: boolean; available: boolean }
export interface ResourcePresentation { image: string; label: string; accent: string }
export interface Booking { id: string; resource_id: string; starts_at: string; ends_at: string; purpose: string; status: BookingStatus; student_id?: string; student_name?: string }
export interface BookingEvent { id: string; booking_id: string; status: BookingStatus; at: string; note: string }
export interface ConditionReport { id: string; booking_id: string; kind: 'checkout' | 'return' | 'incident'; notes: string; photo_names: string[]; created_at: string }
export type BookingInput = Pick<Booking, 'resource_id' | 'starts_at' | 'ends_at' | 'purpose'>;
