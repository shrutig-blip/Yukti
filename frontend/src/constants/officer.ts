/**
 * Hardcoded officer identities for demo purposes — no password/JWT needed.
 * The judged behavior here is: different officers can be "logged in" as,
 * and their name should show up as the distinct actor across the app
 * (navbar, decision modal, audit trail, reports) — NOT real security.
 *
 * CURRENT_OFFICER is kept as the default/fallback (used by mockData.ts,
 * which is static seed data evaluated at module load time, outside React,
 * so it can't read live context). Everywhere else, use useCurrentOfficer()
 * from context/OfficerContext.tsx instead of importing CURRENT_OFFICER
 * directly — that's what makes the officer switchable.
 */
export interface OfficerProfile {
  name: string;
  designation: string;
  fullDesignation: string;
  department: string;
  initials: string;
}

export const OFFICERS: OfficerProfile[] = [
  {
    name: 'S. Ramanathan',
    designation: 'DGM (Procurement)',
    fullDesignation: 'Dy. General Manager (Procurement)',
    department: 'CPCL',
    initials: 'SR',
  },
  {
    name: 'Anjali Verma',
    designation: 'Asst. Procurement Officer',
    fullDesignation: 'Assistant Procurement Officer',
    department: 'CPCL',
    initials: 'AV',
  },
  {
    name: 'Rajeev Menon',
    designation: 'Chief Materials Manager',
    fullDesignation: 'Chief Materials Manager',
    department: 'CPCL',
    initials: 'RM',
  },
];

export const CURRENT_OFFICER: OfficerProfile = OFFICERS[0];