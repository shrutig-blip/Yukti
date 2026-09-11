export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type VerificationResult = 'PASS' | 'REVIEW REQUIRED' | 'FAIL' | 'PENDING' | 'UNAVAILABLE';
export type MatchStatus = 'MATCH' | 'DISCREPANCY' | 'VARIATION' | 'PENDING' | 'CLEAR' | 'REVIEW';

export interface Tender {
  id: string;
  title: string;
  department: string;
  deadline: string;
  estimatedValue: string;
  biddersCount: number;
  verifiedCount: number;
  pendingCount: number;
  overallStatus: 'Compliant' | 'Review Required' | 'Non-Compliant' | 'Pending Verification';
  description: string;
  requirementsCount: number;
  extractedDate: string;
}

export interface TenderRequirement {
  id: string;
  tenderId: string;
  requirement: string;
  evidenceRequired: string;
  isMandatory: boolean;
  verificationMethod: string;
  status: 'PASS' | 'REVIEW REQUIRED' | 'FAIL' | 'PENDING';
  category: 'Financial' | 'Technical / Experience' | 'Statutory' | 'Authorization' | 'Integrity / Debarment';
  officerConfirmed: boolean;
  remarks?: string;
  evidenceSource?: string;
  lastUpdated?: string;
}

export interface OfficerDecision {
  decision: 'QUALIFIED' | 'DISQUALIFIED' | 'CLARIFICATION_REQUESTED' | 'PENDING';
  officerName: string;
  officerDesignation: string;
  timestamp: string;
  comments: string;
  conditionsOrStipulations?: string;
}

export interface Bidder {
  id: string;
  name: string;
  pan: string;
  gstin: string;
  udyam: string;
  tenderId: string;
  complianceScore: number;
  riskLevel: SeverityLevel;
  verificationProgress: number; // 0 - 100
  status: 'Pending Review' | 'Qualified' | 'Disqualified' | 'Clarification Requested' | 'Under Verification';
  documentsCount: number;
  discrepanciesCount: number;
  criticalAlertsCount: number;
  incorporationDate: string;
  registeredAddress: string;
  officerDecision?: OfficerDecision;
}

export interface ValidationCheck {
  check: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  note: string;
}

export interface CrossCheckRecord {
  submittedField: string;
  submittedValue: string;
  portalField: string;
  portalValue: string;
  matchStatus: MatchStatus;
  sourceName: string;
  verificationId: string;
  timestamp: string;
}

export interface DocumentRecord {
  id: string;
  bidderId: string;
  name: string;
  category:
    | 'PAN'
    | 'GST Certificate'
    | 'Udyam Certificate'
    | 'Certificate of Incorporation'
    | 'Audited Financial Statements'
    | 'Experience Certificate'
    | 'OEM Authorization'
    | 'BIS Certificate'
    | 'Debarment / Blacklist Declaration'
    | 'EPFO / ESIC'
    | 'Startup India / NSIC';
  uploadedDate: string;
  expiryDate?: string;
  ocrStatus: 'Complete' | 'Processing' | 'Failed';
  validationStatus: 'Valid' | 'Review Required' | 'Invalid';
  crossVerificationStatus: 'MATCH' | 'MISMATCH' | 'PENDING' | 'SOURCE_UNAVAILABLE' | 'CLEAR';
  riskLevel: SeverityLevel;
  fileSize: string;
  extractedData: Record<string, string | number>;
  validationChecks: ValidationCheck[];
  crossCheckRecord?: CrossCheckRecord;
  integrityCheck?: {
    status: 'CLEAR' | 'REVIEW REQUIRED';
    detectedNote?: string;
    confidence: number;
  };
}

export interface VerificationSource {
  id: string;
  name: string;
  category: string;
  verificationStatus: 'VERIFIED' | 'WARNING' | 'PENDING' | 'UNAVAILABLE';
  lastChecked: string;
  evidenceSummary: string;
  matchStatus: 'MATCH' | 'REVIEW' | 'CLEAR' | 'DISCREPANCY';
  endpointNote: string;
  isSimulated: boolean;
}

export interface ContradictionItem {
  id: string;
  bidderId: string;
  field: string;
  sources: Array<{ source: string; value: string }>;
  assessment: string;
  severity: SeverityLevel;
  recommendation: string;
  status: 'Active' | 'Reviewed' | 'Resolved';
  evidenceRef: string;
}

export interface RiskFactor {
  id: string;
  name: string;
  severity: SeverityLevel;
  description: string;
  weight: number;
  evidenceRef: string;
  category: 'Financial' | 'Statutory' | 'Authorization' | 'Integrity' | 'Technical';
}

export interface ComplianceBreakdown {
  statutoryCompliance: number;
  documentCompleteness: number;
  tenderEligibility: number;
  financialCompliance: number;
  authorizationCompliance: number;
  dataSource?: Partial<
    Record<
      'statutoryCompliance' | 'documentCompleteness' | 'tenderEligibility' | 'financialCompliance' | 'authorizationCompliance',
      'real' | 'not_tracked'
    >
  >;
}

export interface ExpiryItem {
  requirement: string;
  documentName: string;
  expiryDate: string;
  daysRemaining: number;
  risk: SeverityLevel;
  actionRequired: string;
}

export interface RedFlagHistoryItem {
  year: string;
  date: string;
  title: string;
  description: string;
  type: 'neutral' | 'milestone' | 'warning' | 'critical';
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  role: 'AI Verification Engine' | 'AI Compliance Engine' | 'Procurement Officer' | 'System';
  action: string;
  source: string;
  result: 'PASS' | 'REVIEW' | 'RECORDED' | 'PENDING' | 'DISCREPANCY' | 'OVERRIDDEN' | 'QUALIFIED' | 'DISQUALIFIED';
  evidenceRef?: string;
  comments?: string;
  bidderId?: string;
}

export interface ClarificationDraft {
  bidderId: string;
  bidderName: string;
  tenderId: string;
  subject: string;
  issuesIdentified: string[];
  generatedBody: string;
  deadlineDays: number;
}
