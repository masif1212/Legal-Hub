export type CaseRepositoryStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED'
  | 'REMOVED';

export type CaseVisibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE' | 'ORGANIZATION';

export type CaseSourceType =
  | 'USER_SUBMITTED'
  | 'OFFICIAL_COURT'
  | 'IMPORTED_EDITORIAL'
  | 'COMMUNITY_CURATED';

export type CaseReactionType = 'LIKE' | 'UPVOTE' | 'DOWNVOTE' | 'HELPFUL' | 'INSIGHTFUL';

export interface CaseUserSummary {
  id: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  username?: string | null;
  headline?: string | null;
  organizationName?: string | null;
  roleLabel?: string;
  isLawyer?: boolean;
  isVerifiedLawyer?: boolean;
  firmName?: string | null;
  barCouncil?: string | null;
  regionName?: string | null;
}

export interface CaseTaxonomy {
  id: string;
  name: string;
  colorHex?: string | null;
}

export interface CaseCourtSummary {
  id: string;
  name: string;
  level: 'LOCAL' | 'DISTRICT' | 'HIGH' | 'APPELLATE' | 'SUPREME' | 'TRIBUNAL' | 'OTHER';
}

export interface CaseSourceLinkItem {
  id: string;
  label: string;
  sourceName: string;
  url: string;
  publishedAt?: string | null;
  isPrimary?: boolean;
}

export interface CaseSourceFileItem {
  id: string;
  label: string;
  filename: string;
  fileType: string;
  fileSizeLabel: string;
  uploadedAt: string;
  url?: string;
}

export interface CaseRevisionItem {
  id: string;
  version: number;
  status: CaseRepositoryStatus;
  createdAt: string;
  changeSummary: string;
  editor: CaseUserSummary;
  reviewedBy?: CaseUserSummary | null;
}

export interface CaseCitationItem {
  id: string;
  slug: string;
  title: string;
  canonicalCitation: string;
  court?: string | null;
  decisionDate?: string | null;
  relationshipLabel: string;
  note?: string | null;
}

export interface CaseCommentItem {
  id: string;
  author: CaseUserSummary;
  body: string;
  createdAt: string;
  editedAt?: string | null;
  moderationState?: 'VISIBLE' | 'FLAGGED' | 'UNDER_REVIEW';
  reactions: Array<{ type: CaseReactionType; count: number }>;
  replies?: CaseCommentItem[];
}

export interface CaseDiscussionLink {
  id: string;
  slug: string;
  title: string;
  answerCount: number;
  updatedAt: string;
}

export interface CaseModerationSummary {
  openReports: number;
  aiAlerts: number;
  lastReviewerNote?: string | null;
}

export interface CaseRepositoryRecord {
  id: string;
  slug: string;
  title: string;
  canonicalCitation: string;
  summary: string;
  facts: string;
  issues: string;
  holding: string;
  outcome: string;
  proceduralHistory: string;
  docketNumber?: string | null;
  category: CaseTaxonomy;
  tags: CaseTaxonomy[];
  region?: CaseTaxonomy | null;
  court?: CaseCourtSummary | null;
  status: CaseRepositoryStatus;
  visibility: CaseVisibility;
  sourceType: CaseSourceType;
  author: CaseUserSummary;
  organization?: { id: string; name: string } | null;
  decisionDate?: string | null;
  filedDate?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  reviewedAt?: string | null;
  trustLabel: string;
  provenanceLabel: string;
  counts: {
    views: number;
    comments: number;
    saves: number;
    follows: number;
    reactions: number;
    outboundCitations: number;
    inboundCitations: number;
  };
  viewerState: {
    saved: boolean;
    followed: boolean;
    reaction?: CaseReactionType | null;
  };
  sourceLinks: CaseSourceLinkItem[];
  sourceFiles: CaseSourceFileItem[];
  revisions: CaseRevisionItem[];
  citationsMade: CaseCitationItem[];
  citationsReceived: CaseCitationItem[];
  comments: CaseCommentItem[];
  relatedDiscussions: CaseDiscussionLink[];
  moderation: CaseModerationSummary;
}

export interface CaseRepositoryFilters {
  search: string;
  category: string;
  tag: string;
  region: string;
  court: string;
  sourceType: string;
  visibility: string;
  status: string;
  authorScope: string;
  organization: string;
  dateRange: string;
  sort: CaseRepositorySort;
}

export type CaseRepositorySort =
  | 'relevant'
  | 'recent'
  | 'decision_date'
  | 'views'
  | 'follows'
  | 'helpful'
  | 'cited';

export interface CaseRepositoryFilterOptions {
  categories: CaseTaxonomy[];
  tags: CaseTaxonomy[];
  regions: CaseTaxonomy[];
  courts: CaseCourtSummary[];
  organizations: Array<{ id: string; name: string }>;
  sourceTypes: CaseSourceType[];
  statuses: CaseRepositoryStatus[];
  visibilities: CaseVisibility[];
}

export interface CaseRepositoryInsight {
  label: string;
  value: string;
  detail: string;
}

export interface CaseDraftPayload {
  title: string;
  canonicalCitation?: string;
  docketNumber?: string;
  summary?: string;
  facts?: string;
  issues?: string;
  holding?: string;
  outcome?: string;
  proceduralHistory?: string;
  categorySlug: string;
  tagSlugs: string[];
  regionSlug?: string;
  courtSlug?: string;
  visibility: CaseVisibility;
  sourceType: CaseSourceType;
  sourceLinks: Array<{ label?: string; sourceName?: string; url: string }>;
  citations: string[];
}
