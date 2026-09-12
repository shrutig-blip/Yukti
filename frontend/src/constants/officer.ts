/**
 * There's no login/auth system yet, so the app runs as a single hardcoded
 * "demo officer" everywhere a procurement officer's identity is shown or
 * recorded (navbar, decision modal, reports, audit actor, etc.).
 *
 * This is the ONE place that identity is defined. Every component that
 * needs the officer's name/designation should import from here instead of
 * hardcoding the string — when a real login system lands, this is also the
 * one place that needs to change (swap the constant for the logged-in
 * officer's real data).
 */
export const CURRENT_OFFICER = {
  name: 'S. Ramanathan',
  designation: 'DGM (Procurement)',
  fullDesignation: 'Dy. General Manager (Procurement)',
  department: 'CPCL',
  initials: 'SR',
} as const;
