import { prisma } from "@/lib/prisma";
import { PERMISSION_CATALOG, ROLE_CATALOG } from "@/lib/auth/permission-catalog";
import {
  AIAlertSeverity,
  AIAlertStatus,
  AuditCategory,
  CaseSourceType,
  ContentTargetType,
  ContentVisibility,
  FileScanStatus,
  LawyerVerificationStatus,
  MfaFactorStatus,
  NotificationType,
  OrganizationMemberStatus,
  Prisma,
  ReportStatus,
  RepositoryItemStatus,
  SummaryStatus,
  UserStatus,
  UserType,
} from "@prisma/client";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const PRIVILEGED_ROLES = ["admin", "super_admin", "moderator"] as const;
const CATALOG_PERMISSION_KEYS = PERMISSION_CATALOG.map((permission) => permission.key);
const ROLE_DISPLAY_ORDER = new Map(ROLE_CATALOG.map((role, index) => [role.name.toLowerCase(), index]));
const USER_STATUSES = new Set(Object.values(UserStatus));
const LAWYER_VERIFICATION_STATUSES = new Set(Object.values(LawyerVerificationStatus));
const USER_TYPES = new Set(Object.values(UserType));
const CONTENT_TARGET_TYPES = new Set(Object.values(ContentTargetType));
const AUDIT_CATEGORIES = new Set(Object.values(AuditCategory));
const REPORT_STATUSES = new Set(Object.values(ReportStatus));
const AI_ALERT_STATUSES = new Set(Object.values(AIAlertStatus));
const AI_ALERT_SEVERITIES = new Set(Object.values(AIAlertSeverity));
const FILE_SCAN_STATUSES = new Set(Object.values(FileScanStatus));
const NOTIFICATION_TYPES = new Set(Object.values(NotificationType));
const REQUIRED_VERIFICATION_DOCUMENT_TYPES = ["BAR_LICENSE", "NATIONAL_ID"] as const;
const GAMIFICATION_LEADERBOARD_EXCLUDED_TOKENS = [
  "admin",
] as const;

export interface AdminQueueItem {
  id: string;
  title: string;
  href: string;
  status: string;
  meta: string;
  ageLabel: string;
}

export interface AdminDashboardData {
  generatedAt: Date;
  filters: {
    rangeDays: number;
    bucket: "day" | "week" | "month";
  };
  kpis: {
    users: {
      total: number;
      newToday: number;
      active7d: number;
      active30d: number;
      suspended: number;
      disabled: number;
      deleted: number;
    };
    verification: {
      openRequests: number;
      verifiedLawyers: number;
      rejectedRequests: number;
      expiringSoon: number;
    };
    discussions: {
      createdToday: number;
      answersToday: number;
      commentsToday: number;
      unresolved: number;
      lockedOrHidden: number;
    };
    cases: {
      drafts: number;
      pendingReview: number;
      publishedToday: number;
      rejectedToday: number;
      archived: number;
      removed: number;
      averageApprovalHours: number | null;
    };
    moderation: {
      openReports: number;
      openAlerts: number;
      criticalAlerts: number;
      contentHiddenOrRemoved: number;
      actionsLast7d: number;
    };
    files: {
      pendingScan: number;
      infected: number;
      failed: number;
      uploadedToday: number;
    };
    notifications: {
      generatedToday: number;
      unreadSystemNotices: number;
    };
    security: {
      auditEvents24h: number;
      failedLogins24h: number;
      lockedCredentials: number;
      activePrivilegedSessions: number;
    };
  };
  charts: {
    userActivityBreakdown: Array<{
      label: string;
      total: number;
    }>;
    activityTimeline: Array<{
      dateKey: string;
      dateLabel: string;
      newUsers: number;
      discussions: number;
      answers: number;
      comments: number;
      caseSubmissions: number;
      casePublished: number;
      notifications: number;
    }>;
    riskTimeline: Array<{
      dateKey: string;
      dateLabel: string;
      reports: number;
      alerts: number;
      failedLogins: number;
      fileUploads: number;
    }>;
    caseReviewTimeline: Array<{
      dateKey: string;
      dateLabel: string;
      submitted: number;
      published: number;
      rejected: number;
    }>;
    caseStatusBreakdown: Array<{
      status: string;
      total: number;
    }>;
    discussionStatusBreakdown: Array<{
      status: string;
      total: number;
    }>;
    discussionContentBreakdown: Array<{
      status: string;
      total: number;
    }>;
  };
  queues: {
    caseReview: { total: number; items: AdminQueueItem[] };
    verification: { total: number; items: AdminQueueItem[] };
    reports: { total: number; items: AdminQueueItem[] };
    aiAlerts: { total: number; items: AdminQueueItem[] };
    security: { total: number; items: AdminQueueItem[] };
    fileExceptions: { total: number; items: AdminQueueItem[] };
  };
  insights: {
    mostViewedCases: Array<{
      id: string;
      slug: string;
      title: string;
      viewCount: number;
      followerCount: number;
      bookmarkCount: number;
    }>;
    topTags: Array<{
      tagId: string;
      name: string;
      totalLinks: number;
    }>;
  };
}

export interface AdminUsersFilters {
  q?: string;
  status?: string;
  userType?: string;
  role?: string;
  verification?: string;
  identifier?: string;
  mfa?: string;
  risk?: string;
  createdFrom?: string;
  createdTo?: string;
  lastLoginFrom?: string;
  lastLoginTo?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminUsersPageData {
  filters: {
    q: string;
    status: string;
    userType: string;
    role: string;
    verification: string;
    identifier: string;
    mfa: string;
    risk: string;
    createdFrom: string;
    createdTo: string;
    lastLoginFrom: string;
    lastLoginTo: string;
    page: number;
    pageSize: number;
  };
  summary: {
    totalUsers: number;
    privilegedUsers: number;
    mfaEnabledUsers: number;
    verifiedLawyers: number;
  };
  pagination: {
    total: number;
    totalPages: number;
    start: number;
    end: number;
  };
  rows: Array<{
    id: string;
    displayName: string;
    username: string | null;
    email: string | null;
    roles: string[];
    status: UserStatus;
    verificationStatus: LawyerVerificationStatus | null;
    isLawyer: boolean;
    organizationCount: number;
    activeMfaCount: number;
    regionName: string | null;
    lastLoginAt: Date | null;
    createdAt: Date;
  }>;
}

export interface AdminRolesPageData {
  filters: {
    q: string;
    page: number;
  };
  summary: {
    totalRoles: number;
    systemRoles: number;
    customRoles: number;
    totalAssignments: number;
  };
  pagination: {
    total: number;
    totalPages: number;
    start: number;
    end: number;
  };
  catalog: Array<{
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    isActive: boolean;
    userCount: number;
    permissionCount: number;
    permissions: string[];
    assignedUsers: Array<{
      id: string;
      displayName: string;
      primaryEmail: string | null;
    }>;
  }>;
  rows: Array<{
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    isActive: boolean;
    userCount: number;
    permissionCount: number;
    permissions: string[];
    assignedUsers: Array<{
      id: string;
      displayName: string;
      primaryEmail: string | null;
    }>;
  }>;
}

export interface AdminPermissionsPageData {
  filters: {
    q: string;
    module: string;
  };
  summary: {
    totalPermissions: number;
    moduleCount: number;
    totalRoles: number;
  };
  roles: Array<{
    id: string;
    name: string;
    isSystem: boolean;
    isActive: boolean;
    userCount: number;
    assignedUsers: Array<{
      id: string;
      displayName: string;
      primaryEmail: string | null;
    }>;
  }>;
  rolePermissions: Array<{
    id: string;
    roleId: string;
    roleName: string;
    permissionId: string;
    permissionKey: string;
    isActive: boolean;
    grantedAt: Date;
  }>;
  modules: string[];
  rows: Array<{
    id: string;
    key: string;
    description: string | null;
    module: string;
    isActive: boolean;
    roleIds: string[];
    roleCount: number;
  }>;
}

export interface AdminOrganizationsPageData {
  summary: {
    totalOrganizations: number;
    publicOrganizations: number;
    privateOrganizations: number;
    ownerlessOrganizations: number;
  };
  rows: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    type: string;
    visibility: string;
    ownerId: string | null;
    ownerName: string | null;
    verifiedAt: Date | null;
    memberCount: number;
    discussionCount: number;
    caseCount: number;
    recentMembers: Array<{
      id: string;
      userId: string;
      displayName: string;
      role: string;
      status: string;
      joinedAt: Date;
    }>;
  }>;
}

export interface AdminTaxonomyPageData {
  summary: {
    categories: number;
    tags: number;
    regions: number;
    courts: number;
    inactiveCategories: number;
    inactiveTags: number;
    inactiveRegions: number;
    inactiveCourts: number;
  };
  categories: Array<{
    id: string;
    slug: string;
    name: string;
    scope: string;
    isActive: boolean;
    sortOrder: number;
    parentName: string | null;
    usageCount: number;
  }>;
  tags: Array<{
    id: string;
    slug: string;
    name: string;
    type: string;
    isActive: boolean;
    discussionCount: number;
    caseCount: number;
  }>;
  regions: Array<{
    id: string;
    slug: string;
    name: string;
    type: string;
    countryCode: string;
    isActive: boolean;
    parentName: string | null;
    courtCount: number;
  }>;
  courts: Array<{
    id: string;
    slug: string;
    name: string;
    level: string;
    websiteUrl: string | null;
    isActive: boolean;
    regionName: string | null;
    caseCount: number;
  }>;
}

export interface AdminGamificationPageData {
  summary: {
    badges: number;
    activeBadges: number;
    awardedBadges: number;
    totalPointsAwarded: number;
    manualAdjustments30d: number;
  };
  leaders: Array<{
    userId: string;
    displayName: string;
    username: string | null;
    totalPoints: number;
    level: number;
    badgesCount: number;
    acceptedAnswers: number;
    casesPublished: number;
  }>;
  badges: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    pointsAwarded: number;
    isActive: boolean;
    awardCount: number;
  }>;
  recentAwards: Array<{
    id: string;
    userId: string;
    displayName: string;
    badgeName: string;
    awardedAt: Date;
    awardedBy: string | null;
    reason: string | null;
  }>;
  recentManualAdjustments: Array<{
    id: string;
    userId: string;
    displayName: string;
    pointsDelta: number;
    createdAt: Date;
    metadataSummary: string | null;
  }>;
}

export interface AdminUserDetailData {
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    status: UserStatus;
    userType: UserType;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    lastLoginAt: Date | null;
    lastLoginIp: string | null;
    lastUserAgent: string | null;
    primaryEmail: string | null;
    primaryPhone: string | null;
    username: string | null;
    headline: string | null;
    bio: string | null;
    city: string | null;
    countryCode: string | null;
    isLawyer: boolean;
    regionName: string | null;
    organizationCount: number;
  };
  profile: {
    websiteUrl: string | null;
    linkedInUrl: string | null;
    completionPercentage: number;
    completionState: string | null;
    stats: {
      discussionCount: number;
      answerCount: number;
      commentCount: number;
      caseCount: number;
      acceptedAnswerCount: number;
      followerCount: number;
      bookmarkCount: number;
      reactionReceivedCount: number;
      profileViewCount: number;
      contributionScore: number;
    } | null;
    gamification: {
      totalPoints: number;
      level: number;
      badgesCount: number;
      likesReceived: number;
      acceptedAnswers: number;
      casesPublished: number;
    } | null;
    badges: Array<{
      id: string;
      code: string;
      name: string;
      reason: string | null;
      awardedAt: Date;
      awardedBy: string | null;
    }>;
  };
  security: {
    credential: {
      passwordSetAt: Date | null;
      mustRotate: boolean;
      failedAttempts: number;
      lockedUntil: Date | null;
    } | null;
    mfaFactors: Array<{
      id: string;
      type: string;
      status: string;
      label: string | null;
      lastUsedAt: Date | null;
      createdAt: Date;
    }>;
    recoveryCodes: {
      total: number;
      consumed: number;
      remaining: number;
    };
    sessions: Array<{
      id: string;
      deviceLabel: string | null;
      ip: string | null;
      userAgent: string | null;
      createdAt: Date;
      lastSeenAt: Date;
      expiresAt: Date;
      revokedAt: Date | null;
      revokeReason: string | null;
    }>;
    loginAttempts: Array<{
      id: string;
      success: boolean;
      identifierValue: string | null;
      failureReason: string | null;
      userAgent: string | null;
      createdAt: Date;
    }>;
  };
  identifiers: Array<{
    id: string;
    type: string;
    value: string;
    isPrimary: boolean;
    verifiedAt: Date | null;
    createdAt: Date;
  }>;
  rolesPermissions: {
    assignments: Array<{
      id: string;
      roleId: string;
      roleName: string;
      roleDescription: string | null;
      isSystem: boolean;
      assignedAt: Date;
      assignedBy: string | null;
      permissionKeys: string[];
    }>;
    effectivePermissions: string[];
    availableRoles: Array<{
      id: string;
      name: string;
      description: string | null;
      isSystem: boolean;
      permissionCount: number;
    }>;
  };
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    status: string;
    title: string | null;
    joinedAt: Date;
    invitedBy: string | null;
    visibility: string;
  }>;
  content: {
    discussions: Array<{ id: string; slug: string; title: string; createdAt: Date; status: string; contentStatus: string }>;
    answers: Array<{ id: string; discussionSlug: string; discussionTitle: string; createdAt: Date; status: string; isAccepted: boolean }>;
    comments: Array<{ id: string; createdAt: Date; status: string; preview: string }>;
    cases: Array<{ id: string; slug: string; title: string; createdAt: Date; status: string; visibility: string }>;
  };
  trustVerification: {
    lawyerProfile: {
      barCouncil: string | null;
      barLicenseNumber: string | null;
      firmName: string | null;
      chamberAddress: string | null;
      practiceStartYear: number | null;
      verificationStatus: LawyerVerificationStatus | null;
      verifiedAt: Date | null;
      verifiedBy: string | null;
    } | null;
    verificationRequests: Array<{
      id: string;
      status: LawyerVerificationStatus;
      submittedAt: Date;
      reviewedAt: Date | null;
      rejectionReason: string | null;
      adminNote: string | null;
      expiresAt: Date | null;
      reviewedBy: string | null;
      documentCount: number;
    }>;
  };
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string | null;
    isRead: boolean;
    createdAt: Date;
    actor: string | null;
  }>;
  auditTimeline: Array<{
    id: string;
    source: "audit" | "moderation";
    category: string;
    action: string;
    reason: string | null;
    note: string | null;
    actor: string | null;
    createdAt: Date;
  }>;
}

export interface AdminVerificationQueueFilters {
  q?: string;
  status?: string;
  region?: string;
  missingDocs?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminVerificationQueueData {
  filters: {
    q: string;
    status: string;
    region: string;
    missingDocs: string;
    page: number;
    pageSize: number;
  };
  summary: {
    openRequests: number;
    verifiedLawyers: number;
    rejectedRequests: number;
    missingDocuments: number;
  };
  pagination: {
    total: number;
    totalPages: number;
    start: number;
    end: number;
  };
  rows: Array<{
    id: string;
    userId: string;
    displayName: string;
    username: string | null;
    regionName: string | null;
    barCouncil: string | null;
    barLicenseNumber: string | null;
    status: LawyerVerificationStatus;
    submittedAt: Date;
    reviewedAt: Date | null;
    reviewedBy: string | null;
    expiresAt: Date | null;
    adminNote: string | null;
    rejectionReason: string | null;
    documentCount: number;
    missingRequiredDocuments: string[];
    flaggedDocumentCount: number;
  }>;
}

export interface AdminModerationQueueFilters {
  q?: string;
  tab?: string;
  targetType?: string;
  severity?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminModerationQueueData {
  filters: {
    q: string;
    tab: "reports" | "alerts" | "actions";
    targetType: string;
    severity: string;
    status: string;
    page: number;
    pageSize: number;
  };
  summary: {
    openReports: number;
    openAlerts: number;
    criticalAlerts: number;
    actionsLast7d: number;
  };
  pagination: {
    total: number;
    totalPages: number;
    start: number;
    end: number;
  };
  reports: Array<{
    id: string;
    targetType: ContentTargetType;
    reason: string;
    status: ReportStatus;
    description: string | null;
    createdAt: Date;
    reviewedAt: Date | null;
    reviewer: string | null;
    resolutionNote: string | null;
    reporterName: string;
    reportedUserName: string | null;
    targetLabel: string;
    targetHref: string;
  }>;
  alerts: Array<{
    id: string;
    source: string;
    targetType: ContentTargetType;
    severity: AIAlertSeverity;
    status: AIAlertStatus;
    title: string;
    description: string | null;
    riskScore: number | null;
    detectedAt: Date;
    reviewedAt: Date | null;
    reviewer: string | null;
    targetLabel: string;
    targetHref: string;
  }>;
  actions: Array<{
    id: string;
    actionType: string;
    reason: string | null;
    note: string | null;
    createdAt: Date;
    moderator: string;
    targetType: string;
    targetLabel: string;
    targetHref: string;
  }>;
}

export interface AdminCaseReviewQueueFilters {
  q?: string;
  status?: string;
  sourceType?: string;
  region?: string;
  court?: string;
  organization?: string;
  reviewedBy?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminCaseReviewQueueData {
  filters: {
    q: string;
    status: string;
    sourceType: string;
    region: string;
    court: string;
    organization: string;
    reviewedBy: string;
    page: number;
    pageSize: number;
  };
  summary: {
    queueSize: number;
    pendingReview: number;
    rejected: number;
    readyToPublish: number;
  };
  pagination: {
    total: number;
    totalPages: number;
    start: number;
    end: number;
  };
  rows: Array<{
    id: string;
    slug: string;
    title: string;
    canonicalCitation: string | null;
    summary: string | null;
    status: RepositoryItemStatus;
    visibility: ContentVisibility;
    sourceType: CaseSourceType;
    createdAt: Date;
    reviewedAt: Date | null;
    publishedAt: Date | null;
    authorName: string;
    organizationName: string | null;
    categoryName: string;
    courtName: string | null;
    regionName: string | null;
    reviewedBy: string | null;
    revisionCount: number;
    sourceLinkCount: number;
    sourceFileCount: number;
    flaggedFileCount: number;
    openReports: number;
    aiAlerts: number;
  }>;
}

export interface AdminFilesFilters {
  q?: string;
  scanStatus?: string;
  parentType?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminFilesPageData {
  filters: {
    q: string;
    scanStatus: string;
    parentType: string;
    page: number;
    pageSize: number;
  };
  summary: {
    pendingScan: number;
    infected: number;
    failed: number;
    orphaned: number;
  };
  pagination: {
    total: number;
    totalPages: number;
    start: number;
    end: number;
  };
  rows: Array<{
    id: string;
    originalFileName: string;
    mimeType: string | null;
    fileSize: number | null;
    uploaderName: string;
    scanStatus: FileScanStatus;
    scanCompletedAt: Date | null;
    isPublic: boolean;
    createdAt: Date;
    parentCount: number;
    parentSummaries: Array<{
      type: string;
      label: string;
      href: string;
    }>;
  }>;
}

export interface AdminNotificationsFilters {
  q?: string;
  type?: string;
  read?: string;
  recipient?: string;
  actor?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminNotificationsPageData {
  filters: {
    q: string;
    type: string;
    read: string;
    recipient: string;
    actor: string;
    page: number;
    pageSize: number;
  };
  summary: {
    generatedToday: number;
    unreadSystemNotices: number;
    systemNotifications: number;
    unreadTotal: number;
  };
  pagination: {
    total: number;
    totalPages: number;
    start: number;
    end: number;
  };
  rows: Array<{
    id: string;
    type: NotificationType;
    title: string;
    message: string | null;
    isRead: boolean;
    createdAt: Date;
    recipientName: string;
    actorName: string | null;
    relatedLabel: string | null;
    relatedHref: string | null;
  }>;
}

export interface AdminSecurityPageData {
  filters: {
    q: string;
    category: string;
    failedOnly: string;
    privilegedOnly: string;
    sessionPage: number;
    auditPage: number;
  };
  summary: {
    auditEvents24h: number;
    failedLogins24h: number;
    lockedCredentials: number;
    activePrivilegedSessions: number;
    revokedSessions24h: number;
  };
  sessions: Array<{
    id: string;
    userId: string;
    displayName: string;
    primaryEmail: string | null;
    roles: string[];
    ip: string | null;
    userAgent: string | null;
    deviceLabel: string | null;
    createdAt: Date;
    lastSeenAt: Date;
    expiresAt: Date;
  }>;
  sessionPagination: {
    total: number;
    totalPages: number;
    start: number;
    end: number;
  };
  lockedCredentialsRows: Array<{
    userId: string;
    displayName: string;
    primaryEmail: string | null;
    failedAttempts: number;
    lockedUntil: Date;
  }>;
  loginAttemptRows: Array<{
    id: string;
    userId: string | null;
    displayName: string | null;
    primaryEmail: string | null;
    identifierValue: string | null;
    success: boolean;
    failureReason: string | null;
    userAgent: string | null;
    createdAt: Date;
  }>;
  auditRows: Array<{
    id: string;
    category: string;
    action: string;
    actorName: string | null;
    targetUserId: string | null;
    targetUserName: string | null;
    targetType: string | null;
    createdAt: Date;
    metaSummary: string | null;
  }>;
  auditPagination: {
    total: number;
    totalPages: number;
    start: number;
    end: number;
  };
}

export interface AdminSystemJobsData {
  generatedAt: Date;
  summary: {
    pendingFileScans: number;
    failedFileScans: number;
    pendingAiSummaries: number;
    failedAiSummaries: number;
    pendingVerification: number;
    pendingCaseReview: number;
  };
  dbQueues: Array<{
    key: string;
    title: string;
    count: number;
    oldestAge: string;
    href: string;
    detail: string;
    status: "healthy" | "attention";
  }>;
  throughput: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  unsupportedSurfaces: Array<{
    title: string;
    detail: string;
    status: "external" | "not_modeled";
  }>;
}

export interface AdminReportsData {
  generatedAt: Date;
  filters: {
    rangeDays: number;
    bucket: "week" | "month";
    rankingLimit: number;
  };
  summary: {
    newUsersInRange: number;
    publishedCasesInRange: number;
    openModerationSignals: number;
    verificationApprovalRateInRange: number | null;
  };
  summaryNotes: string[];
  userGrowth: Array<{ label: string; users: number }>;
  contentCreation: Array<{
    label: string;
    discussions: number;
    answers: number;
    comments: number;
    cases: number;
  }>;
  verificationThroughput: Array<{
    label: string;
    submitted: number;
    approved: number;
    rejected: number;
  }>;
  moderationLoad: Array<{
    label: string;
    reports: number;
    alerts: number;
    actions: number;
  }>;
  rankings: {
    regions: Array<{ label: string; count: number }>;
    courts: Array<{ label: string; count: number }>;
    categories: Array<{ label: string; count: number }>;
    tags: Array<{ label: string; score: number }>;
  };
  queueAging: Array<{
    label: string;
    value: string;
    href: string;
  }>;
  anomalies: Array<{
    label: string;
    detail: string;
    status: "warning" | "stable";
  }>;
}

export interface AdminReportsFilters {
  range?: string;
  bucket?: string;
  rankingLimit?: string;
}

export interface AdminDashboardFilters {
  range?: string;
  bucket?: string;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysAgo(date: Date, amount: number) {
  return new Date(date.getTime() - amount * DAY_IN_MS);
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function toDayKey(date: Date) {
  const normalized = startOfDay(date);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, "0");
  const day = String(normalized.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const normalized = startOfDay(date);
  const offset = (normalized.getDay() + 6) % 7;
  return addDays(normalized, -offset);
}

function hoursBetween(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / (60 * 60 * 1000);
}

function formatAgeLabel(value: Date, now: Date) {
  const diff = now.getTime() - value.getTime();

  if (diff < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.floor(diff / (60 * 1000)));
    return `${minutes}m ago`;
  }

  if (diff < DAY_IN_MS) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h ago`;
  }

  const days = Math.floor(diff / DAY_IN_MS);
  return `${days}d ago`;
}

function buildAdminUserHref(userId: string, tab?: string) {
  return tab ? `/user/${userId}?tab=${tab}` : `/user/${userId}`;
}

function parseDateInput(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildRealUserWhere() {
  return {
    NOT: {
      identifiers: {
        some: {
          type: "EMAIL" as const,
          value: {
            endsWith: "@legalhub.demo",
            mode: "insensitive" as const,
          },
        },
      },
    },
  };
}

function normalizePersonLabel(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeCompactIdentity(value: string | null | undefined) {
  return normalizePersonLabel(value).replace(/^adv\.?\s*/i, "").replace(/^@/, "").replace(/[^a-z0-9]+/g, "");
}

function normalizeDashboardRangeDays(value?: string) {
  const allowed = new Set([7, 14, 30, 90, 365]);
  const parsed = Number.parseInt(value ?? "", 10);
  return allowed.has(parsed) ? parsed : 14;
}

function normalizeDashboardBucket(value?: string): "day" | "week" | "month" {
  if (value === "week" || value === "month") return value;
  return "day";
}

function buildDashboardBuckets(now: Date, rangeDays: number, bucket: "day" | "week" | "month") {
  const rangeStart = daysAgo(startOfDay(now), rangeDays - 1);

  if (bucket === "day") {
    const labelFormatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    });
    const buckets = Array.from({ length: rangeDays }, (_, index) => {
      const start = addDays(rangeStart, index);
      return {
        start,
        end: addDays(start, 1),
        label: labelFormatter.format(start),
      };
    });

    return { rangeStart, buckets };
  }

  if (bucket === "week") {
    const firstBucketStart = startOfWeek(rangeStart);
    const lastBucketStart = startOfWeek(now);
    const labelFormatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    });
    const buckets: Array<{ start: Date; end: Date; label: string }> = [];

    for (let cursor = firstBucketStart; cursor <= lastBucketStart; cursor = addDays(cursor, 7)) {
      buckets.push({
        start: cursor,
        end: addDays(cursor, 7),
        label: labelFormatter.format(cursor),
      });
    }

    return { rangeStart, buckets };
  }

  const firstBucketStart = startOfMonth(rangeStart);
  const currentMonthStart = startOfMonth(now);
  const labelFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  });
  const buckets: Array<{ start: Date; end: Date; label: string }> = [];

  for (let cursor = firstBucketStart; cursor <= currentMonthStart; cursor = addMonths(cursor, 1)) {
    buckets.push({
      start: cursor,
      end: addMonths(cursor, 1),
      label: labelFormatter.format(cursor),
    });
  }

  return { rangeStart, buckets };
}

function normalizeReportsRangeDays(value?: string) {
  const allowed = new Set([30, 90, 180, 365]);
  const parsed = Number.parseInt(value ?? "", 10);
  return allowed.has(parsed) ? parsed : 180;
}

function normalizeReportsBucket(value?: string): "week" | "month" {
  return value === "week" ? "week" : "month";
}

function normalizeReportsRankingLimit(value?: string) {
  const allowed = new Set([5, 10, 15]);
  const parsed = Number.parseInt(value ?? "", 10);
  return allowed.has(parsed) ? parsed : 5;
}

function buildReportBuckets(now: Date, rangeDays: number, bucket: "week" | "month") {
  const rangeStart = daysAgo(startOfDay(now), rangeDays - 1);

  if (bucket === "week") {
    const firstBucketStart = startOfWeek(rangeStart);
    const lastBucketStart = startOfWeek(now);
    const labelFormatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    });
    const buckets: Array<{ start: Date; end: Date; label: string }> = [];

    for (let cursor = firstBucketStart; cursor <= lastBucketStart; cursor = addDays(cursor, 7)) {
      buckets.push({
        start: cursor,
        end: addDays(cursor, 7),
        label: labelFormatter.format(cursor),
      });
    }

    return { rangeStart, buckets };
  }

  const firstBucketStart = startOfMonth(rangeStart);
  const currentMonthStart = startOfMonth(now);
  const labelFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  });
  const buckets: Array<{ start: Date; end: Date; label: string }> = [];

  for (let cursor = firstBucketStart; cursor <= currentMonthStart; cursor = addMonths(cursor, 1)) {
    buckets.push({
      start: cursor,
      end: addMonths(cursor, 1),
      label: labelFormatter.format(cursor),
    });
  }

  return { rangeStart, buckets };
}

function getPermissionModule(permissionKey: string) {
  const [moduleName] = permissionKey.split(".");
  return moduleName?.trim() ? moduleName.trim() : "general";
}

function compareAdminRoles(
  left: { name: string; isSystem: boolean; isActive: boolean },
  right: { name: string; isSystem: boolean; isActive: boolean },
) {
  if (left.isActive !== right.isActive) {
    return left.isActive ? -1 : 1;
  }

  const leftOrder = ROLE_DISPLAY_ORDER.get(left.name.toLowerCase());
  const rightOrder = ROLE_DISPLAY_ORDER.get(right.name.toLowerCase());

  if (leftOrder !== undefined || rightOrder !== undefined) {
    if (leftOrder === undefined) return 1;
    if (rightOrder === undefined) return -1;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  }

  if (left.isSystem !== right.isSystem) {
    return left.isSystem ? -1 : 1;
  }

  return left.name.localeCompare(right.name);
}

function summarizeAuditMeta(meta: unknown) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;

  const entries = Object.entries(meta as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 3)
    .map(([key, value]) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return `${key}: ${String(value)}`;
      }

      return `${key}: [complex]`;
    });

  return entries.length ? entries.join(" / ") : null;
}

function containsDemoIdentityText(value: string | null | undefined) {
  if (!value) return false;

  const normalized = value.toLowerCase();
  return (
    normalized.includes("@legalhub.demo") ||
    normalized.includes("demo.lawyer") ||
    normalized.includes("hassan.raza") ||
    normalized.includes("fatima.noor") ||
    normalized.includes("shahid.khan") ||
    normalized.includes("nimra.khan") ||
    normalized.includes("adv. hassan raza") ||
    normalized.includes("adv. fatima noor") ||
    normalized.includes("adv. shahid khan") ||
    normalized.includes("adv. nimra khan")
  );
}

function bucketDates<T extends Date | null | undefined>(
  dates: T[],
  buckets: Array<{ start: Date; end: Date; label: string }>,
) {
  return buckets.map((bucket) =>
    dates.reduce((count, value) => {
      if (!value) return count;
      return value >= bucket.start && value < bucket.end ? count + 1 : count;
    }, 0),
  );
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function buildDiscussionHref(slug: string) {
  return `/discussions/${slug}`;
}

function buildCaseHref(slug: string) {
  return `/cases/${slug}`;
}

function buildCaseReviewHref(slug: string) {
  return `/case-review/${slug}`;
}

function buildAnswerTarget(answer: { id: string; discussion: { slug: string; title: string } | null }) {
  if (answer.discussion) {
    return {
      label: `Answer on ${answer.discussion.title}`,
      href: buildDiscussionHref(answer.discussion.slug),
    };
  }

  return {
    label: `Answer ${answer.id}`,
    href: "#",
  };
}

function buildCommentTarget(comment: {
  id: string;
  discussion: { slug: string; title: string } | null;
  caseRecord: { slug: string; title: string } | null;
}) {
  if (comment.discussion) {
    return {
      label: `Comment on ${comment.discussion.title}`,
      href: buildDiscussionHref(comment.discussion.slug),
    };
  }

  if (comment.caseRecord) {
    return {
      label: `Comment on ${comment.caseRecord.title}`,
      href: buildCaseHref(comment.caseRecord.slug),
    };
  }

  return {
    label: `Comment ${comment.id}`,
    href: "#",
  };
}

export async function getAdminDashboardData(filters: AdminDashboardFilters = {}): Promise<AdminDashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const sevenDaysStart = daysAgo(todayStart, 6);
  const thirtyDaysStart = daysAgo(todayStart, 29);
  const rangeDays = normalizeDashboardRangeDays(filters.range);
  const bucket = normalizeDashboardBucket(filters.bucket);
  const { rangeStart, buckets } = buildDashboardBuckets(now, rangeDays, bucket);
  const last24HoursStart = new Date(now.getTime() - DAY_IN_MS);
  const nextSevenDays = new Date(now.getTime() + 7 * DAY_IN_MS);
  const moderationOpenStatuses = [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW];
  const alertOpenStatuses = [AIAlertStatus.OPEN, AIAlertStatus.ACKNOWLEDGED];
  const realUserWhere = buildRealUserWhere();

  const [
    totalUsers,
    newUsersToday,
    activeUsers7d,
    activeUsers30d,
    suspendedUsers,
    disabledUsers,
    deletedUsers,
    openVerificationRequests,
    verifiedLawyers,
    rejectedVerificationRequests,
    expiringVerificationRequests,
    discussionsCreatedToday,
    answersPostedToday,
    commentsPostedToday,
    unresolvedDiscussions,
    lockedOrHiddenThreads,
    draftCases,
    pendingReviewCases,
    publishedToday,
    rejectedToday,
    archivedCases,
    removedCases,
    recentlyReviewedCases,
    openReports,
    openAlerts,
    criticalAlerts,
    hiddenOrRemovedDiscussions,
    hiddenOrRemovedAnswers,
    hiddenOrRemovedComments,
    removedCaseCount,
    moderationActionsLast7d,
    pendingFiles,
    infectedFiles,
    failedScans,
    filesUploadedToday,
    notificationsToday,
    unreadSystemNotices,
    auditEvents24h,
    failedLogins24h,
    lockedCredentials,
    activePrivilegedSessions,
    pendingCaseQueue,
    verificationQueue,
    reportQueue,
    aiAlertQueue,
    securityQueue,
    fileExceptionQueue,
    mostViewedCases,
    discussionTagCounts,
    caseTagCounts,
    allTags,
    userTrendRecords,
    discussionTrendRecords,
    answerTrendRecords,
    commentTrendRecords,
    caseSubmissionTrendRecords,
    casePublishedTrendRecords,
    caseRejectedTrendRecords,
    notificationTrendRecords,
    reportTrendRecords,
    alertTrendRecords,
    failedLoginTrendRecords,
    fileUploadTrendRecords,
    caseStatusBreakdown,
    discussionStatusBreakdown,
    discussionContentBreakdown,
  ] = await Promise.all([
    prisma.user.count({ where: realUserWhere }),
    prisma.user.count({ where: { AND: [realUserWhere], createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { AND: [realUserWhere], lastLoginAt: { gte: sevenDaysStart } } }),
    prisma.user.count({ where: { AND: [realUserWhere], lastLoginAt: { gte: thirtyDaysStart } } }),
    prisma.user.count({ where: { AND: [realUserWhere], status: UserStatus.SUSPENDED } }),
    prisma.user.count({ where: { AND: [realUserWhere], status: UserStatus.DISABLED } }),
    prisma.user.count({
      where: {
        AND: [realUserWhere],
        OR: [{ status: UserStatus.DELETED }, { deletedAt: { not: null } }],
      },
    }),
    prisma.lawyerVerificationRequest.count({
      where: {
        lawyerProfile: {
          is: {
            user: realUserWhere,
          },
        },
        status: { in: [LawyerVerificationStatus.PENDING, LawyerVerificationStatus.UNDER_REVIEW] },
      },
    }),
    prisma.lawyerProfile.count({
      where: {
        verificationStatus: LawyerVerificationStatus.VERIFIED,
        user: realUserWhere,
      },
    }),
    prisma.lawyerVerificationRequest.count({
      where: {
        lawyerProfile: {
          is: {
            user: realUserWhere,
          },
        },
        status: LawyerVerificationStatus.REJECTED,
      },
    }),
    prisma.lawyerVerificationRequest.count({
      where: {
        lawyerProfile: {
          is: {
            user: realUserWhere,
          },
        },
        status: { in: [LawyerVerificationStatus.PENDING, LawyerVerificationStatus.UNDER_REVIEW] },
        expiresAt: { gte: now, lte: nextSevenDays },
      },
    }),
    prisma.discussion.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.answer.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.comment.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.discussion.count({
      where: {
        status: "OPEN",
        acceptedAnswerId: null,
      },
    }),
    prisma.discussion.count({
      where: {
        OR: [
          { status: { in: ["LOCKED", "HIDDEN"] } },
          { contentStatus: { in: ["HIDDEN", "REMOVED"] } },
        ],
      },
    }),
    prisma.caseRecord.count({ where: { status: RepositoryItemStatus.DRAFT } }),
    prisma.caseRecord.count({ where: { status: RepositoryItemStatus.PENDING_REVIEW } }),
    prisma.caseRecord.count({ where: { publishedAt: { gte: todayStart } } }),
    prisma.caseRecord.count({
      where: {
        status: RepositoryItemStatus.REJECTED,
        reviewedAt: { gte: todayStart },
      },
    }),
    prisma.caseRecord.count({ where: { status: RepositoryItemStatus.ARCHIVED } }),
    prisma.caseRecord.count({ where: { status: RepositoryItemStatus.REMOVED } }),
    prisma.caseRecord.findMany({
      where: {
        reviewedAt: { not: null },
        status: { in: [RepositoryItemStatus.PUBLISHED, RepositoryItemStatus.REJECTED] },
      },
      select: { createdAt: true, reviewedAt: true },
      orderBy: { reviewedAt: "desc" },
      take: 50,
    }),
    prisma.contentReport.count({
      where: { status: { in: moderationOpenStatuses } },
    }),
    prisma.aIAlert.count({
      where: { status: { in: alertOpenStatuses } },
    }),
    prisma.aIAlert.count({
      where: {
        status: { in: alertOpenStatuses },
        severity: AIAlertSeverity.CRITICAL,
      },
    }),
    prisma.discussion.count({
      where: { contentStatus: { in: ["HIDDEN", "REMOVED"] } },
    }),
    prisma.answer.count({
      where: { status: { in: ["HIDDEN", "REMOVED"] } },
    }),
    prisma.comment.count({
      where: { status: { in: ["HIDDEN", "REMOVED"] } },
    }),
    prisma.caseRecord.count({
      where: { status: RepositoryItemStatus.REMOVED },
    }),
    prisma.moderationAction.count({
      where: { createdAt: { gte: daysAgo(now, 7) } },
    }),
    prisma.fileAsset.count({ where: { scanStatus: FileScanStatus.PENDING } }),
    prisma.fileAsset.count({ where: { scanStatus: FileScanStatus.INFECTED } }),
    prisma.fileAsset.count({ where: { scanStatus: FileScanStatus.FAILED } }),
    prisma.fileAsset.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.notification.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.notification.count({
      where: { type: "SYSTEM", isRead: false },
    }),
    prisma.auditLog.count({ where: { createdAt: { gte: last24HoursStart } } }),
    prisma.loginAttempt.count({
      where: {
        success: false,
        createdAt: { gte: last24HoursStart },
      },
    }),
    prisma.credential.count({
      where: { lockedUntil: { gt: now } },
    }),
    prisma.session.count({
      where: {
        revokedAt: null,
        expiresAt: { gt: now },
        user: {
          roles: {
            some: {
              role: {
                name: { in: [...PRIVILEGED_ROLES] },
              },
            },
          },
        },
      },
    }),
    prisma.caseRecord.findMany({
      where: { status: RepositoryItemStatus.PENDING_REVIEW },
      select: {
        id: true,
        slug: true,
        title: true,
        createdAt: true,
        sourceType: true,
        author: { select: { displayName: true } },
        court: { select: { name: true } },
        region: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.lawyerVerificationRequest.findMany({
      where: {
        lawyerProfile: {
          is: {
            user: realUserWhere,
          },
        },
        status: { in: [LawyerVerificationStatus.PENDING, LawyerVerificationStatus.UNDER_REVIEW] },
      },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        documents: { select: { id: true } },
        lawyerProfile: {
          select: {
            barCouncil: true,
            user: {
              select: {
                id: true,
                displayName: true,
                profile: { select: { username: true, primaryRegion: { select: { name: true } } } },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: "asc" },
      take: 5,
    }),
    prisma.contentReport.findMany({
      where: { status: { in: moderationOpenStatuses } },
      select: {
        id: true,
        targetType: true,
        reason: true,
        status: true,
        createdAt: true,
        reporter: { select: { displayName: true } },
        reportedUser: { select: { id: true, displayName: true, profile: { select: { username: true } } } },
        discussion: { select: { slug: true, title: true } },
        answer: { select: { id: true, body: true } },
        comment: { select: { id: true, body: true } },
        caseRecord: { select: { slug: true, title: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.aIAlert.findMany({
      where: { status: { in: alertOpenStatuses } },
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        detectedAt: true,
        targetType: true,
      },
      orderBy: [{ severity: "desc" }, { detectedAt: "asc" }],
      take: 5,
    }),
    prisma.loginAttempt.findMany({
      where: {
        success: false,
        createdAt: { gte: last24HoursStart },
      },
      select: {
        id: true,
        createdAt: true,
        failureReason: true,
        identifierValue: true,
        user: {
          select: {
            id: true,
            displayName: true,
            profile: { select: { username: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.fileAsset.findMany({
      where: {
        OR: [
          { scanStatus: { in: [FileScanStatus.INFECTED, FileScanStatus.FAILED] } },
          {
            scanStatus: FileScanStatus.PENDING,
            createdAt: { lt: daysAgo(now, 1) },
          },
        ],
      },
      select: {
        id: true,
        originalFileName: true,
        scanStatus: true,
        createdAt: true,
        uploader: { select: { displayName: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.caseRecord.findMany({
      where: { status: RepositoryItemStatus.PUBLISHED },
      select: {
        id: true,
        slug: true,
        title: true,
        viewCount: true,
        followerCount: true,
        bookmarkCount: true,
      },
      orderBy: [{ viewCount: "desc" }, { followerCount: "desc" }],
      take: 5,
    }),
    prisma.discussionTag.groupBy({
      by: ["tagId"],
      _count: { tagId: true },
      orderBy: { _count: { tagId: "desc" } },
      take: 10,
    }),
    prisma.caseTag.groupBy({
      by: ["tagId"],
      _count: { tagId: true },
      orderBy: { _count: { tagId: "desc" } },
      take: 10,
    }),
    prisma.tag.findMany({
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: {
        createdAt: { gte: rangeStart },
        ...realUserWhere,
      },
      select: { createdAt: true },
    }),
    prisma.discussion.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    prisma.answer.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    prisma.comment.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    prisma.caseRecord.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    prisma.caseRecord.findMany({
      where: { publishedAt: { gte: rangeStart } },
      select: { publishedAt: true },
    }),
    prisma.caseRecord.findMany({
      where: {
        status: RepositoryItemStatus.REJECTED,
        reviewedAt: { gte: rangeStart },
      },
      select: { reviewedAt: true },
    }),
    prisma.notification.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    prisma.contentReport.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    prisma.aIAlert.findMany({
      where: { detectedAt: { gte: rangeStart } },
      select: { detectedAt: true },
    }),
    prisma.loginAttempt.findMany({
      where: {
        success: false,
        createdAt: { gte: rangeStart },
      },
      select: { createdAt: true },
    }),
    prisma.fileAsset.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    prisma.caseRecord.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.discussion.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.discussion.groupBy({
      by: ["contentStatus"],
      _count: { _all: true },
    }),
  ]);

  const averageApprovalHours =
    recentlyReviewedCases.length > 0
      ? Math.round(
          recentlyReviewedCases.reduce((sum, item) => {
            if (!item.reviewedAt) return sum;
            return sum + hoursBetween(item.createdAt, item.reviewedAt);
          }, 0) / recentlyReviewedCases.length,
        )
      : null;

  const tagNames = new Map(allTags.map((tag) => [tag.id, tag.name]));
  const tagTotals = new Map<string, number>();

  for (const item of discussionTagCounts) {
    tagTotals.set(item.tagId, (tagTotals.get(item.tagId) ?? 0) + item._count.tagId);
  }

  for (const item of caseTagCounts) {
    tagTotals.set(item.tagId, (tagTotals.get(item.tagId) ?? 0) + item._count.tagId);
  }

  const topTags = Array.from(tagTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tagId, totalLinks]) => ({
      tagId,
      name: tagNames.get(tagId) ?? "Unknown tag",
      totalLinks,
    }));

  const userTrendCounts = bucketDates(userTrendRecords.map((item) => item.createdAt), buckets);
  const discussionTrendCounts = bucketDates(discussionTrendRecords.map((item) => item.createdAt), buckets);
  const answerTrendCounts = bucketDates(answerTrendRecords.map((item) => item.createdAt), buckets);
  const commentTrendCounts = bucketDates(commentTrendRecords.map((item) => item.createdAt), buckets);
  const caseSubmissionTrendCounts = bucketDates(caseSubmissionTrendRecords.map((item) => item.createdAt), buckets);
  const casePublishedTrendCounts = bucketDates(casePublishedTrendRecords.map((item) => item.publishedAt), buckets);
  const caseRejectedTrendCounts = bucketDates(caseRejectedTrendRecords.map((item) => item.reviewedAt), buckets);
  const notificationTrendCounts = bucketDates(notificationTrendRecords.map((item) => item.createdAt), buckets);
  const reportTrendCounts = bucketDates(reportTrendRecords.map((item) => item.createdAt), buckets);
  const alertTrendCounts = bucketDates(alertTrendRecords.map((item) => item.detectedAt), buckets);
  const failedLoginTrendCounts = bucketDates(failedLoginTrendRecords.map((item) => item.createdAt), buckets);
  const fileUploadTrendCounts = bucketDates(fileUploadTrendRecords.map((item) => item.createdAt), buckets);

  const activityTimeline = buckets.map((currentBucket, index) => ({
    dateKey: toDayKey(currentBucket.start),
    dateLabel: currentBucket.label,
    newUsers: userTrendCounts[index] ?? 0,
    discussions: discussionTrendCounts[index] ?? 0,
    answers: answerTrendCounts[index] ?? 0,
    comments: commentTrendCounts[index] ?? 0,
    caseSubmissions: caseSubmissionTrendCounts[index] ?? 0,
    casePublished: casePublishedTrendCounts[index] ?? 0,
    notifications: notificationTrendCounts[index] ?? 0,
  }));

  const riskTimeline = buckets.map((currentBucket, index) => ({
    dateKey: toDayKey(currentBucket.start),
    dateLabel: currentBucket.label,
    reports: reportTrendCounts[index] ?? 0,
    alerts: alertTrendCounts[index] ?? 0,
    failedLogins: failedLoginTrendCounts[index] ?? 0,
    fileUploads: fileUploadTrendCounts[index] ?? 0,
  }));

  const caseReviewTimeline = buckets.map((currentBucket, index) => ({
    dateKey: toDayKey(currentBucket.start),
    dateLabel: currentBucket.label,
    submitted: caseSubmissionTrendCounts[index] ?? 0,
    published: casePublishedTrendCounts[index] ?? 0,
    rejected: caseRejectedTrendCounts[index] ?? 0,
  }));

  const inactiveUsers30d = Math.max(totalUsers - activeUsers30d, 0);

  return {
    generatedAt: now,
    filters: {
      rangeDays,
      bucket,
    },
    kpis: {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        active7d: activeUsers7d,
        active30d: activeUsers30d,
        suspended: suspendedUsers,
        disabled: disabledUsers,
        deleted: deletedUsers,
      },
      verification: {
        openRequests: openVerificationRequests,
        verifiedLawyers,
        rejectedRequests: rejectedVerificationRequests,
        expiringSoon: expiringVerificationRequests,
      },
      discussions: {
        createdToday: discussionsCreatedToday,
        answersToday: answersPostedToday,
        commentsToday: commentsPostedToday,
        unresolved: unresolvedDiscussions,
        lockedOrHidden: lockedOrHiddenThreads,
      },
      cases: {
        drafts: draftCases,
        pendingReview: pendingReviewCases,
        publishedToday,
        rejectedToday,
        archived: archivedCases,
        removed: removedCases,
        averageApprovalHours,
      },
      moderation: {
        openReports,
        openAlerts,
        criticalAlerts,
        contentHiddenOrRemoved:
          hiddenOrRemovedDiscussions + hiddenOrRemovedAnswers + hiddenOrRemovedComments + removedCaseCount,
        actionsLast7d: moderationActionsLast7d,
      },
      files: {
        pendingScan: pendingFiles,
        infected: infectedFiles,
        failed: failedScans,
        uploadedToday: filesUploadedToday,
      },
      notifications: {
        generatedToday: notificationsToday,
        unreadSystemNotices: unreadSystemNotices,
      },
      security: {
        auditEvents24h,
        failedLogins24h,
        lockedCredentials,
        activePrivilegedSessions,
      },
    },
    charts: {
      userActivityBreakdown: [
        { label: "Active 30d", total: activeUsers30d },
        { label: "Inactive", total: inactiveUsers30d },
      ],
      activityTimeline,
      riskTimeline,
      caseReviewTimeline,
      caseStatusBreakdown: caseStatusBreakdown.map((item) => ({
        status: item.status,
        total: item._count._all,
      })),
      discussionStatusBreakdown: discussionStatusBreakdown.map((item) => ({
        status: item.status,
        total: item._count._all,
      })),
      discussionContentBreakdown: discussionContentBreakdown.map((item) => ({
        status: item.contentStatus,
        total: item._count._all,
      })),
    },
    queues: {
      caseReview: {
        total: pendingReviewCases,
        items: pendingCaseQueue.map((item) => ({
          id: item.id,
          title: item.title,
          href: `/case-review/${item.slug}`,
          status: item.sourceType.replaceAll("_", " "),
          meta: [item.author.displayName ?? "Unknown author", item.court?.name ?? item.region?.name ?? "No court mapping"]
            .filter(Boolean)
            .join(" / "),
          ageLabel: formatAgeLabel(item.createdAt, now),
        })),
      },
      verification: {
        total: openVerificationRequests,
        items: verificationQueue.map((item) => {
          const user = item.lawyerProfile.user;
          const regionName = user.profile?.primaryRegion?.name ?? "No region";
          return {
            id: item.id,
            title: user.displayName ?? "Unnamed lawyer",
            href: buildAdminUserHref(user.id, "trust"),
            status: item.status.replaceAll("_", " "),
            meta: [item.lawyerProfile.barCouncil ?? "No bar council", regionName, `${item.documents.length} docs`].join(
              " / ",
            ),
            ageLabel: formatAgeLabel(item.submittedAt, now),
          };
        }),
      },
      reports: {
        total: openReports,
        items: reportQueue.map((item) => {
          const targetTitle =
            item.discussion?.title ??
            item.caseRecord?.title ??
            item.reportedUser?.displayName ??
            item.answer?.body.slice(0, 52) ??
            item.comment?.body.slice(0, 52) ??
            "Reported content";

          return {
            id: item.id,
            title: targetTitle,
            href: item.reportedUser?.id ? buildAdminUserHref(item.reportedUser.id, "audit") : "/moderation?tab=reports",
            status: item.reason.replaceAll("_", " "),
            meta: [item.targetType, item.reporter.displayName ?? "Unknown reporter"].join(" / "),
            ageLabel: formatAgeLabel(item.createdAt, now),
          };
        }),
      },
      aiAlerts: {
        total: openAlerts,
        items: aiAlertQueue.map((item) => ({
          id: item.id,
          title: item.title,
          href: "/moderation",
          status: item.severity,
          meta: [item.targetType, item.status.replaceAll("_", " ")].join(" / "),
          ageLabel: formatAgeLabel(item.detectedAt, now),
        })),
      },
      security: {
        total: failedLogins24h,
        items: securityQueue.map((item) => ({
          id: item.id,
          title: item.user?.displayName ?? item.identifierValue ?? "Unknown login attempt",
          href: item.user ? buildAdminUserHref(item.user.id, "security") : "/user?risk=high",
          status: item.failureReason ?? "FAILED_LOGIN",
          meta: item.identifierValue ?? "No identifier captured",
          ageLabel: formatAgeLabel(item.createdAt, now),
        })),
      },
      fileExceptions: {
        total: infectedFiles + failedScans,
        items: fileExceptionQueue.map((item) => ({
          id: item.id,
          title: item.originalFileName,
          href: `/files?scanStatus=${item.scanStatus}`,
          status: item.scanStatus,
          meta: item.uploader.displayName ?? "Unknown uploader",
          ageLabel: formatAgeLabel(item.createdAt, now),
        })),
      },
    },
    insights: {
      mostViewedCases,
      topTags,
    },
  };
}

export async function getAdminUsersPageData(filters: AdminUsersFilters = {}): Promise<AdminUsersPageData> {
  const q = filters.q?.trim() ?? "";
  const requestedStatus = filters.status?.trim().toUpperCase() ?? "";
  const requestedUserType = filters.userType?.trim().toUpperCase() ?? "";
  const role = filters.role?.trim().toLowerCase() ?? "";
  const requestedVerification = filters.verification?.trim().toUpperCase() ?? "";
  const identifier = filters.identifier?.trim().toLowerCase() ?? "";
  const mfa = filters.mfa?.trim().toLowerCase() ?? "";
  const risk = filters.risk?.trim().toLowerCase() ?? "";
  const requestedPageSize = Number.isFinite(filters.pageSize) ? filters.pageSize : 12;
  const requestedPage = Number.isFinite(filters.page) ? filters.page : 1;
  const pageSize = Math.min(Math.max(requestedPageSize ?? 12, 1), 50);
  const page = Math.max(requestedPage ?? 1, 1);
  const skip = (page - 1) * pageSize;
  const status = USER_STATUSES.has(requestedStatus as UserStatus) ? requestedStatus : "";
  const userType = USER_TYPES.has(requestedUserType as UserType) ? requestedUserType : "";
  const verification = LAWYER_VERIFICATION_STATUSES.has(requestedVerification as LawyerVerificationStatus)
    ? requestedVerification
    : "";
  const createdFrom = parseDateInput(filters.createdFrom);
  const createdTo = parseDateInput(filters.createdTo);
  const lastLoginFrom = parseDateInput(filters.lastLoginFrom);
  const lastLoginTo = parseDateInput(filters.lastLoginTo);
  const highRiskBoundary = daysAgo(new Date(), 30);
  const realUserWhere = buildRealUserWhere();
  const where: Record<string, unknown> = {
    AND: [realUserWhere],
  };

  if (q) {
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { displayName: { contains: q, mode: "insensitive" } },
      { identifiers: { some: { value: { contains: q, mode: "insensitive" } } } },
      { profile: { is: { username: { contains: q, mode: "insensitive" } } } },
      { organizationMemberships: { some: { organization: { name: { contains: q, mode: "insensitive" } } } } },
      { lawyerProfile: { is: { barLicenseNumber: { contains: q, mode: "insensitive" } } } },
    ];
  }

  if (status) {
    where.status = status.toUpperCase();
  }

  if (userType) {
    where.userType = userType;
  }

  if (role) {
    where.roles = { some: { role: { name: role } } };
  }

  if (verification) {
    where.lawyerProfile = { is: { verificationStatus: verification } };
  }

  if (identifier === "verified") {
    where.identifiers = { some: { verifiedAt: { not: null } } };
  } else if (identifier === "unverified") {
    where.identifiers = { some: { verifiedAt: null } };
  }

  if (mfa === "enabled") {
    where.mfaFactors = { some: { status: MfaFactorStatus.ACTIVE } };
  } else if (mfa === "disabled") {
    where.mfaFactors = { none: { status: MfaFactorStatus.ACTIVE } };
  }

  if (risk === "high") {
    where.loginAttempts = {
      some: {
        success: false,
        createdAt: { gte: highRiskBoundary },
      },
    };
  }

  if (createdFrom || createdTo) {
    where.createdAt = {
      ...(createdFrom ? { gte: createdFrom } : {}),
      ...(createdTo ? { lte: createdTo } : {}),
    };
  }

  if (lastLoginFrom || lastLoginTo) {
    where.lastLoginAt = {
      ...(lastLoginFrom ? { gte: lastLoginFrom } : {}),
      ...(lastLoginTo ? { lte: lastLoginTo } : {}),
    };
  }

  const [total, rows, totalUsers, privilegedUsers, mfaEnabledUsers, verifiedLawyers] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        displayName: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        identifiers: {
          where: { type: "EMAIL", isPrimary: true },
          select: { value: true },
          take: 1,
        },
        roles: {
          select: { role: { select: { name: true } } },
          orderBy: { assignedAt: "asc" },
        },
        profile: {
          select: {
            username: true,
            isLawyer: true,
            primaryRegion: { select: { name: true } },
          },
        },
        lawyerProfile: {
          select: { verificationStatus: true },
        },
        organizationMemberships: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
        mfaFactors: {
          where: { status: MfaFactorStatus.ACTIVE },
          select: { id: true },
        },
      },
      orderBy: [{ createdAt: "desc" }, { displayName: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where: realUserWhere }),
    prisma.user.count({
      where: {
        AND: [realUserWhere],
        roles: {
          some: {
            role: { name: { in: [...PRIVILEGED_ROLES] } },
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        AND: [realUserWhere],
        mfaFactors: { some: { status: MfaFactorStatus.ACTIVE } },
      },
    }),
    prisma.lawyerProfile.count({
      where: { verificationStatus: LawyerVerificationStatus.VERIFIED, user: realUserWhere },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(safePage * pageSize, total);

  return {
    filters: {
      q,
      status,
      userType,
      role,
      verification,
      identifier,
      mfa,
      risk,
      createdFrom: filters.createdFrom?.trim() ?? "",
      createdTo: filters.createdTo?.trim() ?? "",
      lastLoginFrom: filters.lastLoginFrom?.trim() ?? "",
      lastLoginTo: filters.lastLoginTo?.trim() ?? "",
      page: safePage,
      pageSize,
    },
    summary: {
      totalUsers,
      privilegedUsers,
      mfaEnabledUsers,
      verifiedLawyers,
    },
    pagination: {
      total,
      totalPages,
      start,
      end,
    },
    rows: rows.map((row) => ({
      id: row.id,
      displayName: row.displayName ?? "Unnamed member",
      username: row.profile?.username ?? null,
      email: row.identifiers[0]?.value ?? null,
      roles: row.roles.map((item) => item.role.name),
      status: row.status,
      verificationStatus: row.lawyerProfile?.verificationStatus ?? null,
      isLawyer: row.profile?.isLawyer ?? false,
      organizationCount: row.organizationMemberships.length,
      activeMfaCount: row.mfaFactors.length,
      regionName: row.profile?.primaryRegion?.name ?? null,
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
    })),
  };
}

export async function getAdminUserSearchSuggestions(limit = 24): Promise<string[]> {
  const realUserWhere = buildRealUserWhere();
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const rows = await prisma.user.findMany({
    where: realUserWhere,
    select: {
      displayName: true,
      profile: {
        select: {
          username: true,
        },
      },
      identifiers: {
        where: { type: "EMAIL", isPrimary: true },
        select: { value: true },
        take: 1,
      },
    },
    orderBy: [{ createdAt: "desc" }, { displayName: "asc" }],
    take: safeLimit,
  });

  const suggestions = new Set<string>();

  for (const row of rows) {
    const displayName = row.displayName?.trim();
    const username = row.profile?.username?.trim();
    const email = row.identifiers[0]?.value?.trim();

    if (displayName) suggestions.add(displayName);
    if (username) suggestions.add(`@${username}`);
    if (email) suggestions.add(email);
  }

  return Array.from(suggestions).slice(0, safeLimit);
}

export async function getAdminRolesPageData(filters: {
  q?: string;
  page?: number;
} = {}): Promise<AdminRolesPageData> {
  const q = filters.q?.trim() ?? "";
  const pageSize = 5;
  const requestedPage = Number.isFinite(filters.page) ? filters.page : 1;
  const realUserWhere = buildRealUserWhere();

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [totalRoles, systemRoles, totalAssignments] = await Promise.all([
    prisma.role.count({
      where,
    }),
    prisma.role.count({
      where: {
        AND: [where, { isSystem: true }],
      },
    }),
    prisma.userRole.count({
      where: {
        user: realUserWhere,
        role: where,
      },
    }),
  ]);
  const customRoles = totalRoles - systemRoles;
  const totalPages = Math.max(1, Math.ceil(totalRoles / pageSize));
  const page = Math.min(Math.max(requestedPage ?? 1, 1), totalPages);
  const skip = (page - 1) * pageSize;
  const roleSelect = Prisma.validator<Prisma.RoleSelect>()({
    id: true,
    name: true,
    description: true,
    isSystem: true,
    isActive: true,
    permissions: {
      select: {
        isActive: true,
        permission: {
          select: {
            key: true,
          },
        },
      },
      orderBy: {
        permission: {
          key: "asc",
        },
      },
    },
    users: {
      where: {
        user: realUserWhere,
      },
      orderBy: [{ assignedAt: "desc" }],
      take: 6,
      select: {
        user: {
          select: {
            id: true,
            displayName: true,
            identifiers: {
              where: {
                type: "EMAIL",
              },
              orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
              take: 1,
              select: {
                value: true,
              },
            },
          },
        },
      },
    },
    _count: {
      select: {
        users: {
          where: {
            user: realUserWhere,
          },
        },
        permissions: true,
      },
    },
  });

  const catalogRoles = await prisma.role.findMany({
    where,
    select: roleSelect,
  });
  const start = totalRoles === 0 ? 0 : skip + 1;
  const end = totalRoles === 0 ? 0 : Math.min(skip + pageSize, totalRoles);

  const mapRoleRow = (role: (typeof catalogRoles)[number]) => ({
    id: role.id,
    name: role.name,
    description: role.description ?? null,
    isSystem: role.isSystem,
    isActive: role.isActive,
    userCount: role._count.users,
    permissionCount: role.permissions.filter((permission) => permission.isActive).length,
    permissions: role.permissions.filter((permission) => permission.isActive).map((permission) => permission.permission.key),
    assignedUsers: role.users.map((assignment) => ({
      id: assignment.user.id,
      displayName: assignment.user.displayName ?? "Unnamed member",
      primaryEmail: assignment.user.identifiers[0]?.value ?? null,
    })),
  });
  const sortedRoles = [...catalogRoles].sort(compareAdminRoles);
  const paginatedRoles = sortedRoles.slice(skip, skip + pageSize);

  return {
    filters: {
      q,
      page,
    },
    summary: {
      totalRoles,
      systemRoles,
      customRoles,
      totalAssignments,
    },
    pagination: {
      total: totalRoles,
      totalPages,
      start,
      end,
    },
    catalog: sortedRoles.map(mapRoleRow),
    rows: paginatedRoles.map(mapRoleRow),
  };
}

export async function getAdminPermissionsPageData(filters: {
  q?: string;
  module?: string;
} = {}): Promise<AdminPermissionsPageData> {
  const q = filters.q?.trim() ?? "";
  const requestedModule = filters.module?.trim().toLowerCase() ?? "";
  const realUserWhere = buildRealUserWhere();
  const permissionWhere: Prisma.PermissionWhereInput = {
    key: {
      in: CATALOG_PERMISSION_KEYS,
    },
    ...(q
      ? {
          OR: [
            { key: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [roles, permissions, rolePermissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: [{ isActive: "desc" }, { isSystem: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        isSystem: true,
        isActive: true,
        users: {
          where: {
            user: realUserWhere,
          },
          orderBy: [{ assignedAt: "desc" }],
          take: 6,
          select: {
            user: {
              select: {
                id: true,
                displayName: true,
                identifiers: {
                  where: {
                    type: "EMAIL",
                  },
                  orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
                  take: 1,
                  select: {
                    value: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            users: {
              where: {
                user: realUserWhere,
              },
            },
          },
        },
      },
    }),
    prisma.permission.findMany({
      where: permissionWhere,
      orderBy: [{ isActive: "desc" }, { key: "asc" }],
      select: {
        id: true,
        key: true,
        description: true,
        isActive: true,
        roles: {
          select: {
            isActive: true,
            roleId: true,
          },
        },
      },
    }),
    prisma.rolePermission.findMany({
      where: {
        permission: {
          key: {
            in: CATALOG_PERMISSION_KEYS,
          },
        },
      },
      orderBy: [
        {
          isActive: "desc",
        },
        {
          role: {
            name: "asc",
          },
        },
        {
          permission: {
            key: "asc",
          },
        },
      ],
      select: {
        id: true,
        roleId: true,
        isActive: true,
        grantedAt: true,
        role: {
          select: {
            name: true,
          },
        },
        permission: {
          select: {
            id: true,
            key: true,
          },
        },
      },
    }),
  ]);

  const visibleRoleIds = new Set(roles.map((role) => role.id));

  const rows = permissions
    .map((permission) => {
      const roleIds = permission.roles
        .filter((roleBinding) => roleBinding.isActive)
        .map((roleBinding) => roleBinding.roleId)
        .filter((roleId) => visibleRoleIds.has(roleId));

      return {
        id: permission.id,
        key: permission.key,
        description: permission.description ?? null,
        module: getPermissionModule(permission.key),
        isActive: permission.isActive,
        roleIds,
        roleCount: roleIds.length,
      };
    })
    .filter((row) => (requestedModule ? row.module === requestedModule : true));

  const modules = Array.from(new Set(permissions.map((permission) => getPermissionModule(permission.key)))).sort();

  return {
    filters: {
      q,
      module: requestedModule,
    },
    summary: {
      totalPermissions: rows.length,
      moduleCount: modules.length,
      totalRoles: roles.length,
    },
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
      isActive: role.isActive,
      userCount: role._count.users,
      assignedUsers: role.users.map((assignment) => ({
        id: assignment.user.id,
        displayName: assignment.user.displayName ?? "Unnamed member",
        primaryEmail: assignment.user.identifiers[0]?.value ?? null,
      })),
    })),
    rolePermissions: rolePermissions.map((binding) => ({
      id: binding.id,
      roleId: binding.roleId,
      roleName: binding.role.name,
      permissionId: binding.permission.id,
      permissionKey: binding.permission.key,
      isActive: binding.isActive,
      grantedAt: binding.grantedAt,
    })),
    modules,
    rows,
  };
}

export async function getAdminOrganizationsPageData(): Promise<AdminOrganizationsPageData> {
  const [organizations, totalOrganizations, publicOrganizations, privateOrganizations, ownerlessOrganizations] =
    await Promise.all([
      prisma.organization.findMany({
        orderBy: [{ createdAt: "desc" }, { name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          type: true,
          visibility: true,
          verifiedAt: true,
          owner: { select: { id: true, displayName: true } },
          _count: {
            select: {
              members: true,
              discussions: true,
              caseRecords: true,
            },
          },
          members: {
            take: 5,
            orderBy: { joinedAt: "desc" },
            select: {
              id: true,
              role: true,
              status: true,
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
        },
      }),
      prisma.organization.count(),
      prisma.organization.count({ where: { visibility: "PUBLIC" } }),
      prisma.organization.count({ where: { visibility: { in: ["PRIVATE", "INVITE_ONLY"] } } }),
      prisma.organization.count({ where: { ownerId: null } }),
    ]);

  return {
    summary: {
      totalOrganizations,
      publicOrganizations,
      privateOrganizations,
      ownerlessOrganizations,
    },
    rows: organizations.map((organization) => ({
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      description: organization.description ?? null,
      type: organization.type,
      visibility: organization.visibility,
      ownerId: organization.owner?.id ?? null,
      ownerName: organization.owner?.displayName ?? null,
      verifiedAt: organization.verifiedAt,
      memberCount: organization._count.members,
      discussionCount: organization._count.discussions,
      caseCount: organization._count.caseRecords,
      recentMembers: organization.members.map((member) => ({
        id: member.id,
        userId: member.user.id,
        displayName: member.user.displayName ?? "Unnamed member",
        role: member.role,
        status: member.status,
        joinedAt: member.joinedAt,
      })),
    })),
  };
}

export async function getAdminTaxonomyPageData(): Promise<AdminTaxonomyPageData> {
  const [
    categories,
    tags,
    regions,
    courts,
    categoryCount,
    tagCount,
    regionCount,
    courtCount,
    inactiveCategories,
    inactiveTags,
    inactiveRegions,
    inactiveCourts,
  ] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      take: 30,
      select: {
        id: true,
        slug: true,
        name: true,
        scope: true,
        isActive: true,
        sortOrder: true,
        parent: { select: { name: true } },
        _count: {
          select: {
            discussions: true,
            caseRecords: true,
            lawyerPracticeAreas: true,
          },
        },
      },
    }),
    prisma.tag.findMany({
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      take: 30,
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        isActive: true,
        _count: {
          select: {
            discussions: true,
            cases: true,
          },
        },
      },
    }),
    prisma.region.findMany({
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      take: 30,
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        countryCode: true,
        isActive: true,
        parent: { select: { name: true } },
        _count: {
          select: {
            courts: true,
          },
        },
      },
    }),
    prisma.court.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: 30,
      select: {
        id: true,
        slug: true,
        name: true,
        level: true,
        websiteUrl: true,
        isActive: true,
        region: { select: { name: true } },
        _count: {
          select: {
            caseRecords: true,
          },
        },
      },
    }),
    prisma.category.count(),
    prisma.tag.count(),
    prisma.region.count(),
    prisma.court.count(),
    prisma.category.count({ where: { isActive: false } }),
    prisma.tag.count({ where: { isActive: false } }),
    prisma.region.count({ where: { isActive: false } }),
    prisma.court.count({ where: { isActive: false } }),
  ]);

  return {
    summary: {
      categories: categoryCount,
      tags: tagCount,
      regions: regionCount,
      courts: courtCount,
      inactiveCategories,
      inactiveTags,
      inactiveRegions,
      inactiveCourts,
    },
    categories: categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      scope: category.scope,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      parentName: category.parent?.name ?? null,
      usageCount: category._count.discussions + category._count.caseRecords + category._count.lawyerPracticeAreas,
    })),
    tags: tags.map((tag) => ({
      id: tag.id,
      slug: tag.slug,
      name: tag.name,
      type: tag.type,
      isActive: tag.isActive,
      discussionCount: tag._count.discussions,
      caseCount: tag._count.cases,
    })),
    regions: regions.map((region) => ({
      id: region.id,
      slug: region.slug,
      name: region.name,
      type: region.type,
      countryCode: region.countryCode,
      isActive: region.isActive,
      parentName: region.parent?.name ?? null,
      courtCount: region._count.courts,
    })),
    courts: courts.map((court) => ({
      id: court.id,
      slug: court.slug,
      name: court.name,
      level: court.level,
      websiteUrl: court.websiteUrl ?? null,
      isActive: court.isActive,
      regionName: court.region?.name ?? null,
      caseCount: court._count.caseRecords,
    })),
  };
}

export async function getAdminGamificationPageData(): Promise<AdminGamificationPageData> {
  const realUserWhere = buildRealUserWhere();
  const [leaders, badges, recentAwards, recentManualAdjustments, badgeCount, activeBadges, awardedBadges, totalPointsAwarded, manualAdjustments30d] =
    await Promise.all([
      prisma.userGamification.findMany({
        where: {
          user: realUserWhere,
        },
        orderBy: [{ totalPoints: "desc" }, { level: "desc" }, { updatedAt: "desc" }],
        take: 32,
        select: {
          userId: true,
          totalPoints: true,
          level: true,
          badgesCount: true,
          acceptedAnswers: true,
          casesPublished: true,
          user: {
            select: {
              displayName: true,
              profile: { select: { username: true } },
            },
          },
        },
      }),
      prisma.badge.findMany({
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
        take: 24,
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          pointsAwarded: true,
          isActive: true,
          _count: { select: { users: true } },
        },
      }),
      prisma.userBadge.findMany({
        orderBy: { awardedAt: "desc" },
        take: 20,
        select: {
          id: true,
          awardedAt: true,
          reason: true,
          user: { select: { id: true, displayName: true } },
          badge: { select: { name: true } },
          awardedBy: { select: { displayName: true } },
        },
      }),
      prisma.gamificationEvent.findMany({
        where: {
          eventType: "MANUAL_ADJUSTMENT",
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          pointsDelta: true,
          createdAt: true,
          metadata: true,
          user: { select: { id: true, displayName: true } },
        },
      }),
      prisma.badge.count(),
      prisma.badge.count({ where: { isActive: true } }),
      prisma.userBadge.count(),
      prisma.gamificationEvent.aggregate({
        _sum: { pointsDelta: true },
      }),
      prisma.gamificationEvent.count({
        where: {
          eventType: "MANUAL_ADJUSTMENT",
          createdAt: { gte: daysAgo(new Date(), 30) },
        },
      }),
    ]);

  return {
    summary: {
      badges: badgeCount,
      activeBadges,
      awardedBadges,
      totalPointsAwarded: totalPointsAwarded._sum.pointsDelta ?? 0,
      manualAdjustments30d,
    },
    leaders: leaders
      .map((leader) => ({
        userId: leader.userId,
        displayName: leader.user.displayName ?? "Unnamed member",
        username: leader.user.profile?.username ?? null,
        totalPoints: leader.totalPoints,
        level: leader.level,
        badgesCount: leader.badgesCount,
        acceptedAnswers: leader.acceptedAnswers,
        casesPublished: leader.casesPublished,
      }))
      .filter((leader) => {
        const displayName = normalizeCompactIdentity(leader.displayName);
        const username = normalizeCompactIdentity(leader.username);

        return (
          !GAMIFICATION_LEADERBOARD_EXCLUDED_TOKENS.some(
            (token) => displayName.includes(token) || username.includes(token),
          )
        );
      })
      .slice(0, 12),
    badges: badges.map((badge) => ({
      id: badge.id,
      code: badge.code,
      name: badge.name,
      description: badge.description ?? null,
      pointsAwarded: badge.pointsAwarded,
      isActive: badge.isActive,
      awardCount: badge._count.users,
    })),
    recentAwards: recentAwards.map((award) => ({
      id: award.id,
      userId: award.user.id,
      displayName: award.user.displayName ?? "Unnamed member",
      badgeName: award.badge.name,
      awardedAt: award.awardedAt,
      awardedBy: award.awardedBy?.displayName ?? null,
      reason: award.reason ?? null,
    })),
    recentManualAdjustments: recentManualAdjustments.map((event) => ({
      id: event.id,
      userId: event.user.id,
      displayName: event.user.displayName ?? "Unnamed member",
      pointsDelta: event.pointsDelta,
      createdAt: event.createdAt,
      metadataSummary: summarizeAuditMeta(event.metadata),
    })),
  };
}

export async function getAdminUserDetailData(userId: string): Promise<AdminUserDetailData | null> {
  const [
    user,
    availableRoles,
    discussions,
    answers,
    comments,
    cases,
    notifications,
    auditLogs,
    moderationActions,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        userType: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        lastLoginAt: true,
        lastLoginIp: true,
        lastUserAgent: true,
        identifiers: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: {
            id: true,
            type: true,
            value: true,
            isPrimary: true,
            verifiedAt: true,
            createdAt: true,
          },
        },
        profile: {
          select: {
            username: true,
            headline: true,
            bio: true,
            city: true,
            countryCode: true,
            websiteUrl: true,
            linkedInUrl: true,
            isLawyer: true,
            completionPercentage: true,
            completionState: true,
            primaryRegion: { select: { name: true } },
          },
        },
        stats: {
          select: {
            discussionCount: true,
            answerCount: true,
            commentCount: true,
            caseCount: true,
            acceptedAnswerCount: true,
            followerCount: true,
            bookmarkCount: true,
            reactionReceivedCount: true,
            profileViewCount: true,
            contributionScore: true,
          },
        },
        gamification: {
          select: {
            totalPoints: true,
            level: true,
            badgesCount: true,
            likesReceived: true,
            acceptedAnswers: true,
            casesPublished: true,
          },
        },
        badges: {
          orderBy: { awardedAt: "desc" },
          select: {
            id: true,
            reason: true,
            awardedAt: true,
            badge: { select: { code: true, name: true } },
            awardedBy: { select: { displayName: true } },
          },
        },
        credential: {
          select: {
            passwordSetAt: true,
            mustRotate: true,
            failedAttempts: true,
            lockedUntil: true,
          },
        },
        mfaFactors: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            status: true,
            label: true,
            lastUsedAt: true,
            createdAt: true,
          },
        },
        mfaRecoveryCodes: {
          select: {
            id: true,
            consumedAt: true,
          },
        },
        sessions: {
          orderBy: { lastSeenAt: "desc" },
          take: 10,
          select: {
            id: true,
            deviceLabel: true,
            ip: true,
            userAgent: true,
            createdAt: true,
            lastSeenAt: true,
            expiresAt: true,
            revokedAt: true,
            revokeReason: true,
          },
        },
        loginAttempts: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            success: true,
            identifierValue: true,
            failureReason: true,
            userAgent: true,
            createdAt: true,
          },
        },
        roles: {
          orderBy: { assignedAt: "desc" },
          select: {
            id: true,
            assignedAt: true,
            assignedBy: { select: { displayName: true } },
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                isSystem: true,
                permissions: {
                  select: {
                    permission: { select: { key: true } },
                  },
                },
              },
            },
          },
        },
        organizationMemberships: {
          orderBy: { joinedAt: "desc" },
          select: {
            id: true,
            role: true,
            status: true,
            title: true,
            joinedAt: true,
            invitedBy: { select: { displayName: true } },
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                visibility: true,
              },
            },
          },
        },
        lawyerProfile: {
          select: {
            barCouncil: true,
            barLicenseNumber: true,
            firmName: true,
            chamberAddress: true,
            practiceStartYear: true,
            verificationStatus: true,
            verifiedAt: true,
            verifiedBy: { select: { displayName: true } },
            verificationRequests: {
              orderBy: { submittedAt: "desc" },
              select: {
                id: true,
                status: true,
                submittedAt: true,
                reviewedAt: true,
                rejectionReason: true,
                adminNote: true,
                expiresAt: true,
                reviewedBy: { select: { displayName: true } },
                documents: { select: { id: true } },
              },
            },
          },
        },
      },
    }),
    prisma.role.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        _count: {
          select: {
            permissions: true,
          },
        },
      },
    }),
    prisma.discussion.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, slug: true, title: true, createdAt: true, status: true, contentStatus: true },
    }),
    prisma.answer.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        createdAt: true,
        status: true,
        isAccepted: true,
        discussion: { select: { slug: true, title: true } },
      },
    }),
    prisma.comment.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, createdAt: true, status: true, body: true },
    }),
    prisma.caseRecord.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, slug: true, title: true, createdAt: true, status: true, visibility: true },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
        actor: { select: { displayName: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: {
        OR: [{ targetUserId: userId }, { actorId: userId }],
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        category: true,
        action: true,
        meta: true,
        createdAt: true,
        actor: { select: { displayName: true } },
      },
    }),
    prisma.moderationAction.findMany({
      where: { targetUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        actionType: true,
        reason: true,
        note: true,
        createdAt: true,
        moderator: { select: { displayName: true } },
      },
    }),
  ]);

  if (!user) return null;

  const primaryEmail = user.identifiers.find((item) => item.type === "EMAIL" && item.isPrimary)?.value ?? null;
  const primaryPhone = user.identifiers.find((item) => item.type === "PHONE" && item.isPrimary)?.value ?? null;
  const effectivePermissions = Array.from(
    new Set(
      user.roles.flatMap((assignment) => assignment.role.permissions.map((permission) => permission.permission.key)),
    ),
  ).sort();

  return {
    user: {
      id: user.id,
      displayName: user.displayName ?? "Unnamed member",
      avatarUrl: user.avatarUrl ?? null,
      status: user.status,
      userType: user.userType,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
      lastUserAgent: user.lastUserAgent,
      primaryEmail,
      primaryPhone,
      username: user.profile?.username ?? null,
      headline: user.profile?.headline ?? null,
      bio: user.profile?.bio ?? null,
      city: user.profile?.city ?? null,
      countryCode: user.profile?.countryCode ?? null,
      isLawyer: user.profile?.isLawyer ?? false,
      regionName: user.profile?.primaryRegion?.name ?? null,
      organizationCount: user.organizationMemberships.filter((membership) => membership.status === OrganizationMemberStatus.ACTIVE)
        .length,
    },
    profile: {
      websiteUrl: user.profile?.websiteUrl ?? null,
      linkedInUrl: user.profile?.linkedInUrl ?? null,
      completionPercentage: user.profile?.completionPercentage ?? 0,
      completionState: user.profile?.completionState ?? null,
      stats: user.stats,
      gamification: user.gamification,
      badges: user.badges.map((badge) => ({
        id: badge.id,
        code: badge.badge.code,
        name: badge.badge.name,
        reason: badge.reason,
        awardedAt: badge.awardedAt,
        awardedBy: badge.awardedBy?.displayName ?? null,
      })),
    },
    security: {
      credential: user.credential
        ? {
            passwordSetAt: user.credential.passwordSetAt,
            mustRotate: user.credential.mustRotate,
            failedAttempts: user.credential.failedAttempts,
            lockedUntil: user.credential.lockedUntil,
          }
        : null,
      mfaFactors: user.mfaFactors.map((factor) => ({
        id: factor.id,
        type: factor.type,
        status: factor.status,
        label: factor.label ?? null,
        lastUsedAt: factor.lastUsedAt,
        createdAt: factor.createdAt,
      })),
      recoveryCodes: {
        total: user.mfaRecoveryCodes.length,
        consumed: user.mfaRecoveryCodes.filter((code) => code.consumedAt).length,
        remaining:
          user.mfaRecoveryCodes.length - user.mfaRecoveryCodes.filter((code) => code.consumedAt).length,
      },
      sessions: user.sessions,
      loginAttempts: user.loginAttempts,
    },
    identifiers: user.identifiers.map((identifierRow) => ({
      id: identifierRow.id,
      type: identifierRow.type,
      value: identifierRow.value,
      isPrimary: identifierRow.isPrimary,
      verifiedAt: identifierRow.verifiedAt,
      createdAt: identifierRow.createdAt,
    })),
    rolesPermissions: {
      assignments: user.roles.map((assignment) => ({
        id: assignment.id,
        roleId: assignment.role.id,
        roleName: assignment.role.name,
        roleDescription: assignment.role.description,
        isSystem: assignment.role.isSystem,
        assignedAt: assignment.assignedAt,
        assignedBy: assignment.assignedBy?.displayName ?? null,
        permissionKeys: assignment.role.permissions.map((permission) => permission.permission.key).sort(),
      })),
      effectivePermissions,
      availableRoles: availableRoles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description ?? null,
        isSystem: role.isSystem,
        permissionCount: role._count.permissions,
      })),
    },
    organizations: user.organizationMemberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
      status: membership.status,
      title: membership.title ?? null,
      joinedAt: membership.joinedAt,
      invitedBy: membership.invitedBy?.displayName ?? null,
      visibility: membership.organization.visibility,
    })),
    content: {
      discussions,
      answers: answers.map((answer) => ({
        id: answer.id,
        discussionSlug: answer.discussion.slug,
        discussionTitle: answer.discussion.title,
        createdAt: answer.createdAt,
        status: answer.status,
        isAccepted: answer.isAccepted,
      })),
      comments: comments.map((comment) => ({
        id: comment.id,
        createdAt: comment.createdAt,
        status: comment.status,
        preview: comment.body.slice(0, 140),
      })),
      cases,
    },
    trustVerification: {
      lawyerProfile: user.lawyerProfile
        ? {
            barCouncil: user.lawyerProfile.barCouncil ?? null,
            barLicenseNumber: user.lawyerProfile.barLicenseNumber ?? null,
            firmName: user.lawyerProfile.firmName ?? null,
            chamberAddress: user.lawyerProfile.chamberAddress ?? null,
            practiceStartYear: user.lawyerProfile.practiceStartYear ?? null,
            verificationStatus: user.lawyerProfile.verificationStatus,
            verifiedAt: user.lawyerProfile.verifiedAt,
            verifiedBy: user.lawyerProfile.verifiedBy?.displayName ?? null,
          }
        : null,
      verificationRequests:
        user.lawyerProfile?.verificationRequests.map((request) => ({
          id: request.id,
          status: request.status,
          submittedAt: request.submittedAt,
          reviewedAt: request.reviewedAt,
          rejectionReason: request.rejectionReason,
          adminNote: request.adminNote,
          expiresAt: request.expiresAt,
          reviewedBy: request.reviewedBy?.displayName ?? null,
          documentCount: request.documents.length,
        })) ?? [],
    },
    notifications: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message ?? null,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      actor: notification.actor?.displayName ?? null,
    })),
    auditTimeline: [
      ...auditLogs.map((entry) => ({
        id: entry.id,
        source: "audit" as const,
        category: entry.category,
        action: entry.action,
        reason:
          entry.meta && typeof entry.meta === "object" && "reason" in entry.meta && typeof entry.meta.reason === "string"
            ? entry.meta.reason
            : null,
        note: null,
        actor: entry.actor?.displayName ?? null,
        createdAt: entry.createdAt,
      })),
      ...moderationActions.map((entry) => ({
        id: entry.id,
        source: "moderation" as const,
        category: "MODERATION",
        action: entry.actionType,
        reason: entry.reason ?? null,
        note: entry.note ?? null,
        actor: entry.moderator.displayName ?? null,
        createdAt: entry.createdAt,
      })),
    ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
  };
}

export async function getAdminVerificationQueueData(
  filters: AdminVerificationQueueFilters = {},
): Promise<AdminVerificationQueueData> {
  const q = filters.q?.trim() ?? "";
  const requestedStatus = filters.status?.trim().toUpperCase();
  const status = LAWYER_VERIFICATION_STATUSES.has(requestedStatus as LawyerVerificationStatus)
    ? (requestedStatus ?? "")
    : "";
  const region = filters.region?.trim() ?? "";
  const missingDocs = filters.missingDocs === "yes" ? "yes" : "";
  const pageSize = Math.min(Math.max(filters.pageSize ?? 12, 1), 50);
  const page = Math.max(filters.page ?? 1, 1);
  const skip = (page - 1) * pageSize;
  const realUserWhere = buildRealUserWhere();

  const where: Prisma.LawyerVerificationRequestWhereInput = {
    lawyerProfile: {
      is: {
        user: realUserWhere,
      },
    },
  };

  if (q) {
    where.OR = [
      { lawyerProfile: { is: { user: { displayName: { contains: q, mode: "insensitive" } } } } },
      { lawyerProfile: { is: { user: { profile: { is: { username: { contains: q, mode: "insensitive" } } } } } } },
      { lawyerProfile: { is: { barCouncil: { contains: q, mode: "insensitive" } } } },
      { lawyerProfile: { is: { barLicenseNumber: { contains: q, mode: "insensitive" } } } },
    ];
  }

  if (status) {
    where.status = status as LawyerVerificationStatus;
  }

  if (region) {
    where.lawyerProfile = {
      is: {
        user: {
          AND: [
            realUserWhere,
            {
              profile: {
                is: {
                  primaryRegion: {
                    is: {
                      name: {
                        equals: region,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    };
  }

  const [total, rows, filteredMissingDocRows, openRequests, verifiedLawyers, rejectedRequests, allPendingRequests] =
    await Promise.all([
    prisma.lawyerVerificationRequest.count({ where }),
    prisma.lawyerVerificationRequest.findMany({
      where,
      orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        expiresAt: true,
        adminNote: true,
        rejectionReason: true,
        reviewedBy: { select: { displayName: true } },
        documents: {
          select: {
            type: true,
            asset: { select: { scanStatus: true } },
          },
        },
        lawyerProfile: {
          select: {
            barCouncil: true,
            barLicenseNumber: true,
            user: {
              select: {
                id: true,
                displayName: true,
                profile: {
                  select: {
                    username: true,
                    primaryRegion: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    missingDocs
      ? prisma.lawyerVerificationRequest.findMany({
          where,
          orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            status: true,
            submittedAt: true,
            reviewedAt: true,
            expiresAt: true,
            adminNote: true,
            rejectionReason: true,
            reviewedBy: { select: { displayName: true } },
            documents: {
              select: {
                type: true,
                asset: { select: { scanStatus: true } },
              },
            },
            lawyerProfile: {
              select: {
                barCouncil: true,
                barLicenseNumber: true,
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    profile: {
                      select: {
                        username: true,
                        primaryRegion: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    prisma.lawyerVerificationRequest.count({
      where: {
        lawyerProfile: {
          is: {
            user: realUserWhere,
          },
        },
        status: { in: [LawyerVerificationStatus.PENDING, LawyerVerificationStatus.UNDER_REVIEW] },
      },
    }),
    prisma.lawyerProfile.count({
      where: {
        verificationStatus: LawyerVerificationStatus.VERIFIED,
        user: realUserWhere,
      },
    }),
    prisma.lawyerVerificationRequest.count({
      where: {
        lawyerProfile: {
          is: {
            user: realUserWhere,
          },
        },
        status: LawyerVerificationStatus.REJECTED,
      },
    }),
    prisma.lawyerVerificationRequest.findMany({
      where: {
        lawyerProfile: {
          is: {
            user: realUserWhere,
          },
        },
        status: { in: [LawyerVerificationStatus.PENDING, LawyerVerificationStatus.UNDER_REVIEW] },
      },
      select: {
        id: true,
        documents: { select: { type: true } },
      },
    }),
    ]);

  const normalizeVerificationRow = (row: (typeof rows)[number]) => {
    const documentTypes = new Set(row.documents.map((document) => document.type));
    const missingRequiredDocuments = REQUIRED_VERIFICATION_DOCUMENT_TYPES.filter(
      (requiredType) => !documentTypes.has(requiredType),
    );
    const flaggedDocumentCount = row.documents.filter(
      (document) =>
        document.asset.scanStatus === FileScanStatus.FAILED || document.asset.scanStatus === FileScanStatus.INFECTED,
    ).length;

    return {
      id: row.id,
      userId: row.lawyerProfile.user.id,
      displayName: row.lawyerProfile.user.displayName ?? "Unnamed member",
      username: row.lawyerProfile.user.profile?.username ?? null,
      regionName: row.lawyerProfile.user.profile?.primaryRegion?.name ?? null,
      barCouncil: row.lawyerProfile.barCouncil ?? null,
      barLicenseNumber: row.lawyerProfile.barLicenseNumber ?? null,
      status: row.status,
      submittedAt: row.submittedAt,
      reviewedAt: row.reviewedAt,
      reviewedBy: row.reviewedBy?.displayName ?? null,
      expiresAt: row.expiresAt,
      adminNote: row.adminNote ?? null,
      rejectionReason: row.rejectionReason ?? null,
      documentCount: row.documents.length,
      missingRequiredDocuments,
      flaggedDocumentCount,
    };
  };

  const normalizedRows = rows
    .map((row) => {
      return normalizeVerificationRow(row);
    })
    .filter((row) => (missingDocs ? row.missingRequiredDocuments.length > 0 : true));

  const allNormalizedMissingDocRows = filteredMissingDocRows
    .map((row) => normalizeVerificationRow(row))
    .filter((row) => row.missingRequiredDocuments.length > 0);

  const filteredTotal = missingDocs
    ? allNormalizedMissingDocRows.length
    : total;

  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = filteredTotal === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = filteredTotal === 0 ? 0 : Math.min(safePage * pageSize, filteredTotal);

  return {
    filters: {
      q,
      status,
      region,
      missingDocs,
      page: safePage,
      pageSize,
    },
    summary: {
      openRequests,
      verifiedLawyers,
      rejectedRequests,
      missingDocuments: allPendingRequests.filter((request) => {
        const documentTypes = new Set(request.documents.map((document) => document.type));
        return REQUIRED_VERIFICATION_DOCUMENT_TYPES.some((requiredType) => !documentTypes.has(requiredType));
      }).length,
    },
    pagination: {
      total: filteredTotal,
      totalPages,
      start,
      end,
    },
    rows: missingDocs ? allNormalizedMissingDocRows.slice((safePage - 1) * pageSize, safePage * pageSize) : normalizedRows,
  };
}

export async function getAdminModerationQueueData(
  filters: AdminModerationQueueFilters = {},
): Promise<AdminModerationQueueData> {
  const q = filters.q?.trim() ?? "";
  const tab = filters.tab === "alerts" || filters.tab === "actions" ? filters.tab : "reports";
  const requestedTargetType = filters.targetType?.trim().toUpperCase();
  const targetType = CONTENT_TARGET_TYPES.has(requestedTargetType as ContentTargetType)
    ? (requestedTargetType ?? "")
    : "";
  const requestedSeverity = filters.severity?.trim().toUpperCase();
  const severity = AI_ALERT_SEVERITIES.has(requestedSeverity as AIAlertSeverity)
    ? (requestedSeverity ?? "")
    : "";
  const requestedStatus = filters.status?.trim().toUpperCase();
  const pageSize = Math.min(Math.max(filters.pageSize ?? 12, 1), 50);
  const page = Math.max(filters.page ?? 1, 1);
  const skip = (page - 1) * pageSize;
  const openReportStatuses = [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW];
  const openAlertStatuses = [AIAlertStatus.OPEN, AIAlertStatus.ACKNOWLEDGED];

  const [openReports, openAlerts, criticalAlerts, actionsLast7d] = await Promise.all([
    prisma.contentReport.count({
      where: { status: { in: openReportStatuses } },
    }),
    prisma.aIAlert.count({
      where: { status: { in: openAlertStatuses } },
    }),
    prisma.aIAlert.count({
      where: {
        status: { in: openAlertStatuses },
        severity: AIAlertSeverity.CRITICAL,
      },
    }),
    prisma.moderationAction.count({
      where: { createdAt: { gte: daysAgo(new Date(), 7) } },
    }),
  ]);

  if (tab === "reports") {
    const reportStatus = REPORT_STATUSES.has(requestedStatus as ReportStatus) ? (requestedStatus ?? "") : "";
    const where: Record<string, unknown> = {
      status: reportStatus ? reportStatus : { in: openReportStatuses },
    };

    if (targetType) {
      where.targetType = targetType;
    }

    if (q) {
      where.OR = [
        { reason: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { reporter: { is: { displayName: { contains: q, mode: "insensitive" } } } },
        { reportedUser: { is: { displayName: { contains: q, mode: "insensitive" } } } },
        { discussion: { is: { title: { contains: q, mode: "insensitive" } } } },
        { caseRecord: { is: { title: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.contentReport.count({ where }),
      prisma.contentReport.findMany({
        where,
        orderBy: [{ createdAt: "asc" }],
        skip,
        take: pageSize,
        select: {
          id: true,
          targetType: true,
          reason: true,
          description: true,
          status: true,
          createdAt: true,
          reviewedAt: true,
          resolutionNote: true,
          reporter: { select: { displayName: true } },
          reportedUser: { select: { id: true, displayName: true } },
          reviewedBy: { select: { displayName: true } },
          discussion: { select: { slug: true, title: true } },
          answer: {
            select: {
              id: true,
              discussion: { select: { slug: true, title: true } },
            },
          },
          comment: {
            select: {
              id: true,
              discussion: { select: { slug: true, title: true } },
              caseRecord: { select: { slug: true, title: true } },
            },
          },
          caseRecord: { select: { slug: true, title: true } },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const end = total === 0 ? 0 : Math.min(safePage * pageSize, total);

    return {
      filters: {
        q,
        tab,
        targetType,
        severity: "",
        status: reportStatus,
        page: safePage,
        pageSize,
      },
      summary: {
        openReports,
        openAlerts,
        criticalAlerts,
        actionsLast7d,
      },
      pagination: {
        total,
        totalPages,
        start,
        end,
      },
      reports: rows.map((row) => {
        let targetLabel = "Reported content";
        let targetHref = "#";

        if (row.discussion) {
          targetLabel = row.discussion.title;
          targetHref = buildDiscussionHref(row.discussion.slug);
        } else if (row.answer) {
          const target = buildAnswerTarget(row.answer);
          targetLabel = target.label;
          targetHref = target.href;
        } else if (row.comment) {
          const target = buildCommentTarget(row.comment);
          targetLabel = target.label;
          targetHref = target.href;
        } else if (row.caseRecord) {
          targetLabel = row.caseRecord.title;
          targetHref = buildCaseHref(row.caseRecord.slug);
        } else if (row.reportedUser) {
          targetLabel = `${row.reportedUser.displayName ?? "User"} account`;
          targetHref = buildAdminUserHref(row.reportedUser.id, "audit");
        }

        return {
          id: row.id,
          targetType: row.targetType,
          reason: row.reason,
          status: row.status,
          description: row.description ?? null,
          createdAt: row.createdAt,
          reviewedAt: row.reviewedAt,
          reviewer: row.reviewedBy?.displayName ?? null,
          resolutionNote: row.resolutionNote ?? null,
          reporterName: row.reporter.displayName ?? "Unknown reporter",
          reportedUserName: row.reportedUser?.displayName ?? null,
          targetLabel,
          targetHref,
        };
      }),
      alerts: [],
      actions: [],
    };
  }

  if (tab === "alerts") {
    const alertStatus = AI_ALERT_STATUSES.has(requestedStatus as AIAlertStatus) ? (requestedStatus ?? "") : "";
    const where: Record<string, unknown> = {
      status: alertStatus ? alertStatus : { in: openAlertStatuses },
    };

    if (targetType) {
      where.targetType = targetType;
    }

    if (severity) {
      where.severity = severity;
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { source: { contains: q, mode: "insensitive" } },
        { discussion: { is: { title: { contains: q, mode: "insensitive" } } } },
        { caseRecord: { is: { title: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.aIAlert.count({ where }),
      prisma.aIAlert.findMany({
        where,
        orderBy: [{ severity: "desc" }, { detectedAt: "asc" }],
        skip,
        take: pageSize,
        select: {
          id: true,
          source: true,
          targetType: true,
          severity: true,
          status: true,
          title: true,
          description: true,
          riskScore: true,
          detectedAt: true,
          reviewedAt: true,
          reviewedBy: { select: { displayName: true } },
          discussion: { select: { slug: true, title: true } },
          answer: {
            select: {
              id: true,
              discussion: { select: { slug: true, title: true } },
            },
          },
          comment: {
            select: {
              id: true,
              discussion: { select: { slug: true, title: true } },
              caseRecord: { select: { slug: true, title: true } },
            },
          },
          caseRecord: { select: { slug: true, title: true } },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const end = total === 0 ? 0 : Math.min(safePage * pageSize, total);

    return {
      filters: {
        q,
        tab,
        targetType,
        severity,
        status: alertStatus,
        page: safePage,
        pageSize,
      },
      summary: {
        openReports,
        openAlerts,
        criticalAlerts,
        actionsLast7d,
      },
      pagination: {
        total,
        totalPages,
        start,
        end,
      },
      reports: [],
      alerts: rows.map((row) => {
        let targetLabel = "Flagged content";
        let targetHref = "#";

        if (row.discussion) {
          targetLabel = row.discussion.title;
          targetHref = buildDiscussionHref(row.discussion.slug);
        } else if (row.answer) {
          const target = buildAnswerTarget(row.answer);
          targetLabel = target.label;
          targetHref = target.href;
        } else if (row.comment) {
          const target = buildCommentTarget(row.comment);
          targetLabel = target.label;
          targetHref = target.href;
        } else if (row.caseRecord) {
          targetLabel = row.caseRecord.title;
          targetHref = buildCaseHref(row.caseRecord.slug);
        }

        return {
          id: row.id,
          source: row.source,
          targetType: row.targetType,
          severity: row.severity,
          status: row.status,
          title: row.title,
          description: row.description ?? null,
          riskScore: row.riskScore === null ? null : Number(row.riskScore),
          detectedAt: row.detectedAt,
          reviewedAt: row.reviewedAt,
          reviewer: row.reviewedBy?.displayName ?? null,
          targetLabel,
          targetHref,
        };
      }),
      actions: [],
    };
  }

  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { reason: { contains: q, mode: "insensitive" } },
      { note: { contains: q, mode: "insensitive" } },
      { moderator: { is: { displayName: { contains: q, mode: "insensitive" } } } },
    ];
  }

  if (targetType === ContentTargetType.DISCUSSION) {
    where.discussionId = { not: null };
  } else if (targetType === ContentTargetType.ANSWER) {
    where.answerId = { not: null };
  } else if (targetType === ContentTargetType.COMMENT) {
    where.commentId = { not: null };
  } else if (targetType === ContentTargetType.CASE) {
    where.caseId = { not: null };
  }

  const [total, rows] = await Promise.all([
    prisma.moderationAction.count({ where }),
    prisma.moderationAction.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        actionType: true,
        reason: true,
        note: true,
        createdAt: true,
        moderator: { select: { displayName: true } },
        discussion: { select: { slug: true, title: true } },
        answer: {
          select: {
            id: true,
            discussion: { select: { slug: true, title: true } },
          },
        },
        comment: {
          select: {
            id: true,
            discussion: { select: { slug: true, title: true } },
            caseRecord: { select: { slug: true, title: true } },
          },
        },
        caseRecord: { select: { slug: true, title: true } },
        targetUser: { select: { id: true, displayName: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(safePage * pageSize, total);

  return {
    filters: {
      q,
      tab,
      targetType,
      severity: "",
      status: "",
      page: safePage,
      pageSize,
    },
    summary: {
      openReports,
      openAlerts,
      criticalAlerts,
      actionsLast7d,
    },
    pagination: {
      total,
      totalPages,
      start,
      end,
    },
    reports: [],
    alerts: [],
    actions: rows.map((row) => {
      let targetTypeLabel = "USER";
      let targetLabel = row.targetUser?.displayName ? `${row.targetUser.displayName} account` : "User account";
      let targetHref = row.targetUser ? buildAdminUserHref(row.targetUser.id, "audit") : "#";

      if (row.discussion) {
        targetTypeLabel = "DISCUSSION";
        targetLabel = row.discussion.title;
        targetHref = buildDiscussionHref(row.discussion.slug);
      } else if (row.answer) {
        targetTypeLabel = "ANSWER";
        const target = buildAnswerTarget(row.answer);
        targetLabel = target.label;
        targetHref = target.href;
      } else if (row.comment) {
        targetTypeLabel = "COMMENT";
        const target = buildCommentTarget(row.comment);
        targetLabel = target.label;
        targetHref = target.href;
      } else if (row.caseRecord) {
        targetTypeLabel = "CASE";
        targetLabel = row.caseRecord.title;
        targetHref = buildCaseHref(row.caseRecord.slug);
      }

      return {
        id: row.id,
        actionType: row.actionType,
        reason: row.reason ?? null,
        note: row.note ?? null,
        createdAt: row.createdAt,
        moderator: row.moderator.displayName ?? "Unknown moderator",
        targetType: targetTypeLabel,
        targetLabel,
        targetHref,
      };
    }),
  };
}

export async function getAdminCaseReviewQueueData(
  filters: AdminCaseReviewQueueFilters = {},
): Promise<AdminCaseReviewQueueData> {
  const q = filters.q?.trim() ?? "";
  const requestedStatus = filters.status?.trim().toUpperCase();
  const status =
    Object.values(RepositoryItemStatus).includes(requestedStatus as RepositoryItemStatus) ? (requestedStatus ?? "") : "";
  const requestedSourceType = filters.sourceType?.trim().toUpperCase();
  const sourceType =
    Object.values(CaseSourceType).includes(requestedSourceType as CaseSourceType) ? (requestedSourceType ?? "") : "";
  const region = filters.region?.trim() ?? "";
  const court = filters.court?.trim() ?? "";
  const organization = filters.organization?.trim() ?? "";
  const reviewedBy = filters.reviewedBy?.trim() ?? "";
  const pageSize = Math.min(Math.max(filters.pageSize ?? 12, 1), 50);
  const page = Math.max(filters.page ?? 1, 1);
  const skip = (page - 1) * pageSize;
  const defaultStatuses = [RepositoryItemStatus.DRAFT, RepositoryItemStatus.PENDING_REVIEW, RepositoryItemStatus.REJECTED];

  const where: Record<string, unknown> = {
    deletedAt: null,
    status: status ? status : { in: defaultStatuses },
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { canonicalCitation: { contains: q, mode: "insensitive" } },
      { author: { is: { displayName: { contains: q, mode: "insensitive" } } } },
      { organization: { is: { name: { contains: q, mode: "insensitive" } } } },
      { category: { is: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }

  if (sourceType) {
    where.sourceType = sourceType;
  }

  if (region) {
    where.region = {
      is: {
        name: {
          contains: region,
          mode: "insensitive",
        },
      },
    };
  }

  if (court) {
    where.court = {
      is: {
        name: {
          contains: court,
          mode: "insensitive",
        },
      },
    };
  }

  if (organization) {
    where.organization = {
      is: {
        name: {
          contains: organization,
          mode: "insensitive",
        },
      },
    };
  }

  if (reviewedBy) {
    where.reviewedBy = {
      is: {
        displayName: {
          contains: reviewedBy,
          mode: "insensitive",
        },
      },
    };
  }

  const [total, rows, queueSize, pendingReview, rejected, readyToPublish] = await Promise.all([
    prisma.caseRecord.count({ where }),
    prisma.caseRecord.findMany({
      where,
      orderBy: [{ createdAt: "asc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        canonicalCitation: true,
        summary: true,
        status: true,
        visibility: true,
        sourceType: true,
        createdAt: true,
        reviewedAt: true,
        publishedAt: true,
        revisionCount: true,
        sourceCount: true,
        author: { select: { displayName: true } },
        reviewedBy: { select: { displayName: true } },
        organization: { select: { name: true } },
        category: { select: { name: true } },
        region: { select: { name: true } },
        court: { select: { name: true } },
        sourceFiles: {
          select: {
            id: true,
            asset: { select: { scanStatus: true } },
          },
        },
        reports: {
          where: { status: { in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW] } },
          select: { id: true },
        },
        aiAlerts: {
          where: { status: { in: [AIAlertStatus.OPEN, AIAlertStatus.ACKNOWLEDGED] } },
          select: { id: true },
        },
      },
    }),
    prisma.caseRecord.count({
      where: {
        deletedAt: null,
        status: { in: defaultStatuses },
      },
    }),
    prisma.caseRecord.count({
      where: {
        deletedAt: null,
        status: RepositoryItemStatus.PENDING_REVIEW,
      },
    }),
    prisma.caseRecord.count({
      where: {
        deletedAt: null,
        status: RepositoryItemStatus.REJECTED,
      },
    }),
    prisma.caseRecord.count({
      where: {
        deletedAt: null,
        status: RepositoryItemStatus.PENDING_REVIEW,
        sourceCount: { gt: 0 },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(safePage * pageSize, total);

  return {
    filters: {
      q,
      status,
      sourceType,
      region,
      court,
      organization,
      reviewedBy,
      page: safePage,
      pageSize,
    },
    summary: {
      queueSize,
      pendingReview,
      rejected,
      readyToPublish,
    },
    pagination: {
      total,
      totalPages,
      start,
      end,
    },
    rows: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      canonicalCitation: row.canonicalCitation ?? null,
      summary: row.summary ?? null,
      status: row.status,
      visibility: row.visibility,
      sourceType: row.sourceType,
      createdAt: row.createdAt,
      reviewedAt: row.reviewedAt,
      publishedAt: row.publishedAt,
      authorName: row.author.displayName ?? "Unnamed contributor",
      organizationName: row.organization?.name ?? null,
      categoryName: row.category.name,
      courtName: row.court?.name ?? null,
      regionName: row.region?.name ?? null,
      reviewedBy: row.reviewedBy?.displayName ?? null,
      revisionCount: row.revisionCount,
      sourceLinkCount: row.sourceCount,
      sourceFileCount: row.sourceFiles.length,
      flaggedFileCount: row.sourceFiles.filter(
        (file) => file.asset.scanStatus === FileScanStatus.FAILED || file.asset.scanStatus === FileScanStatus.INFECTED,
      ).length,
      openReports: row.reports.length,
      aiAlerts: row.aiAlerts.length,
    })),
  };
}

export async function getAdminFilesPageData(filters: AdminFilesFilters = {}): Promise<AdminFilesPageData> {
  const q = filters.q?.trim() ?? "";
  const requestedScanStatus = filters.scanStatus?.trim().toUpperCase();
  const scanStatus = FILE_SCAN_STATUSES.has(requestedScanStatus as FileScanStatus) ? (requestedScanStatus ?? "") : "";
  const parentType = filters.parentType?.trim().toLowerCase() ?? "";
  const pageSize = Math.min(Math.max(filters.pageSize ?? 12, 1), 50);
  const page = Math.max(filters.page ?? 1, 1);
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { originalFileName: { contains: q, mode: "insensitive" } },
      { mimeType: { contains: q, mode: "insensitive" } },
      { checksumSha256: { contains: q, mode: "insensitive" } },
      { uploader: { is: { displayName: { contains: q, mode: "insensitive" } } } },
    ];
  }

  if (scanStatus) {
    where.scanStatus = scanStatus;
  }

  if (parentType === "discussion") {
    where.attachments = { some: { discussionId: { not: null } } };
  } else if (parentType === "answer") {
    where.attachments = { some: { answerId: { not: null } } };
  } else if (parentType === "comment") {
    where.attachments = { some: { commentId: { not: null } } };
  } else if (parentType === "case") {
    where.OR = [{ attachments: { some: { caseId: { not: null } } } }, { caseSourceFiles: { some: {} } }];
  } else if (parentType === "verification") {
    where.verificationDocuments = { some: {} };
  } else if (parentType === "orphaned") {
    where.attachments = { none: {} };
    where.verificationDocuments = { none: {} };
    where.caseSourceFiles = { none: {} };
  }

  const [total, rows, pendingScan, infected, failed, orphaned] = await Promise.all([
    prisma.fileAsset.count({ where }),
    prisma.fileAsset.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        originalFileName: true,
        mimeType: true,
        fileSize: true,
        scanStatus: true,
        scanCompletedAt: true,
        isPublic: true,
        createdAt: true,
        uploader: { select: { displayName: true } },
        attachments: {
          take: 4,
          select: {
            discussion: { select: { slug: true, title: true } },
            answer: { select: { id: true, discussion: { select: { slug: true, title: true } } } },
            comment: {
              select: {
                id: true,
                discussion: { select: { slug: true, title: true } },
                caseRecord: { select: { slug: true, title: true } },
              },
            },
            caseRecord: { select: { slug: true, title: true } },
          },
        },
        verificationDocuments: {
          take: 4,
          select: {
            verificationRequest: {
              select: {
                lawyerProfile: {
                  select: {
                    user: {
                      select: {
                        id: true,
                        displayName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        caseSourceFiles: {
          take: 4,
          select: {
            caseRecord: { select: { slug: true, title: true } },
          },
        },
      },
    }),
    prisma.fileAsset.count({ where: { scanStatus: FileScanStatus.PENDING } }),
    prisma.fileAsset.count({ where: { scanStatus: FileScanStatus.INFECTED } }),
    prisma.fileAsset.count({ where: { scanStatus: FileScanStatus.FAILED } }),
    prisma.fileAsset.count({
      where: {
        attachments: { none: {} },
        verificationDocuments: { none: {} },
        caseSourceFiles: { none: {} },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(safePage * pageSize, total);

  return {
    filters: {
      q,
      scanStatus,
      parentType,
      page: safePage,
      pageSize,
    },
    summary: {
      pendingScan,
      infected,
      failed,
      orphaned,
    },
    pagination: {
      total,
      totalPages,
      start,
      end,
    },
    rows: rows.map((row) => {
      const parentSummaries: AdminFilesPageData["rows"][number]["parentSummaries"] = [];

      for (const attachment of row.attachments) {
        if (attachment.discussion) {
          parentSummaries.push({
            type: "discussion",
            label: attachment.discussion.title,
            href: buildDiscussionHref(attachment.discussion.slug),
          });
        } else if (attachment.answer) {
          const target = buildAnswerTarget(attachment.answer);
          parentSummaries.push({
            type: "answer",
            label: target.label,
            href: target.href,
          });
        } else if (attachment.comment) {
          const target = buildCommentTarget(attachment.comment);
          parentSummaries.push({
            type: "comment",
            label: target.label,
            href: target.href,
          });
        } else if (attachment.caseRecord) {
          parentSummaries.push({
            type: "case_attachment",
            label: attachment.caseRecord.title,
            href: buildCaseHref(attachment.caseRecord.slug),
          });
        }
      }

      for (const verificationDocument of row.verificationDocuments) {
        const user = verificationDocument.verificationRequest.lawyerProfile.user;
        parentSummaries.push({
          type: "verification",
          label: `${user.displayName ?? "User"} verification`,
          href: buildAdminUserHref(user.id, "trust"),
        });
      }

      for (const caseSourceFile of row.caseSourceFiles) {
        parentSummaries.push({
          type: "case_source",
          label: caseSourceFile.caseRecord.title,
          href: buildCaseReviewHref(caseSourceFile.caseRecord.slug),
        });
      }

      return {
        id: row.id,
        originalFileName: row.originalFileName,
        mimeType: row.mimeType ?? null,
        fileSize: row.fileSize ?? null,
        uploaderName: row.uploader.displayName ?? "Unknown uploader",
        scanStatus: row.scanStatus,
        scanCompletedAt: row.scanCompletedAt,
        isPublic: row.isPublic,
        createdAt: row.createdAt,
        parentCount: row.attachments.length + row.verificationDocuments.length + row.caseSourceFiles.length,
        parentSummaries,
      };
    }),
  };
}

export async function getAdminNotificationsPageData(
  filters: AdminNotificationsFilters = {},
): Promise<AdminNotificationsPageData> {
  const q = filters.q?.trim() ?? "";
  const requestedType = filters.type?.trim().toUpperCase();
  const type = NOTIFICATION_TYPES.has(requestedType as NotificationType) ? (requestedType ?? "") : "";
  const read = filters.read === "read" || filters.read === "unread" ? filters.read : "";
  const recipient = filters.recipient?.trim() ?? "";
  const actor = filters.actor?.trim() ?? "";
  const pageSize = Math.min(Math.max(filters.pageSize ?? 12, 1), 50);
  const page = Math.max(filters.page ?? 1, 1);
  const skip = (page - 1) * pageSize;
  const todayStart = startOfDay(new Date());

  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
      { user: { is: { displayName: { contains: q, mode: "insensitive" } } } },
      { actor: { is: { displayName: { contains: q, mode: "insensitive" } } } },
    ];
  }

  if (type) {
    where.type = type;
  }

  if (read === "read") {
    where.isRead = true;
  } else if (read === "unread") {
    where.isRead = false;
  }

  if (recipient) {
    where.user = {
      is: {
        displayName: {
          contains: recipient,
          mode: "insensitive",
        },
      },
    };
  }

  if (actor) {
    where.actor = {
      is: {
        displayName: {
          contains: actor,
          mode: "insensitive",
        },
      },
    };
  }

  const [total, rows, generatedToday, unreadSystemNotices, systemNotifications, unreadTotal] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
        user: { select: { displayName: true } },
        actor: { select: { displayName: true } },
        discussion: { select: { slug: true, title: true } },
        answer: { select: { id: true, discussion: { select: { slug: true, title: true } } } },
        comment: {
          select: {
            id: true,
            discussion: { select: { slug: true, title: true } },
            caseRecord: { select: { slug: true, title: true } },
          },
        },
        caseRecord: { select: { slug: true, title: true } },
        organization: { select: { name: true } },
      },
    }),
    prisma.notification.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.notification.count({ where: { type: NotificationType.SYSTEM, isRead: false } }),
    prisma.notification.count({ where: { type: NotificationType.SYSTEM } }),
    prisma.notification.count({ where: { isRead: false } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(safePage * pageSize, total);

  return {
    filters: {
      q,
      type,
      read,
      recipient,
      actor,
      page: safePage,
      pageSize,
    },
    summary: {
      generatedToday,
      unreadSystemNotices,
      systemNotifications,
      unreadTotal,
    },
    pagination: {
      total,
      totalPages,
      start,
      end,
    },
    rows: rows.map((row) => {
      let relatedLabel: string | null = null;
      let relatedHref: string | null = null;

      if (row.discussion) {
        relatedLabel = row.discussion.title;
        relatedHref = buildDiscussionHref(row.discussion.slug);
      } else if (row.answer) {
        const target = buildAnswerTarget(row.answer);
        relatedLabel = target.label;
        relatedHref = target.href;
      } else if (row.comment) {
        const target = buildCommentTarget(row.comment);
        relatedLabel = target.label;
        relatedHref = target.href;
      } else if (row.caseRecord) {
        relatedLabel = row.caseRecord.title;
        relatedHref = buildCaseHref(row.caseRecord.slug);
      } else if (row.organization) {
        relatedLabel = row.organization.name;
        relatedHref = null;
      }

      return {
        id: row.id,
        type: row.type,
        title: row.title,
        message: row.message ?? null,
        isRead: row.isRead,
        createdAt: row.createdAt,
        recipientName: row.user.displayName ?? "Unknown recipient",
        actorName: row.actor?.displayName ?? null,
        relatedLabel,
        relatedHref,
      };
    }),
  };
}

export async function getAdminSecurityPageData(filters: {
  q?: string;
  category?: string;
  failedOnly?: string;
  privilegedOnly?: string;
  sessionPage?: number;
  auditPage?: number;
} = {}): Promise<AdminSecurityPageData> {
  const now = new Date();
  const dayStart = daysAgo(now, 1);
  const q = filters.q?.trim() ?? "";
  const category = AUDIT_CATEGORIES.has(filters.category as AuditCategory) ? (filters.category as AuditCategory) : "";
  const failedOnly = filters.failedOnly === "1" ? "1" : "";
  const privilegedOnly = filters.privilegedOnly === "1" ? "1" : "";
  const sessionPageSize = 5;
  const requestedSessionPage = Number.isFinite(filters.sessionPage) ? filters.sessionPage : 1;
  const sessionPage = Math.max(requestedSessionPage ?? 1, 1);
  const auditPageSize = 5;
  const requestedAuditPage = Number.isFinite(filters.auditPage) ? filters.auditPage : 1;
  const auditPage = Math.max(requestedAuditPage ?? 1, 1);
  const realUserWhere = buildRealUserWhere();

  const userSearch =
    q ?
      {
        AND: [realUserWhere],
        OR: [
          { displayName: { contains: q, mode: "insensitive" as const } },
          { identifiers: { some: { value: { contains: q, mode: "insensitive" as const } } } },
          { profile: { is: { username: { contains: q, mode: "insensitive" as const } } } },
        ],
      }
    : {};

  const privilegedUserSearch = {
    AND: [realUserWhere],
    roles: {
      some: {
        role: {
          name: { in: [...PRIVILEGED_ROLES] },
        },
      },
    },
  };

  const sessionUserWhere = privilegedOnly ? { AND: [realUserWhere, privilegedUserSearch] } : realUserWhere;
  const auditWhere = {
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q, mode: "insensitive" as const } },
            { actor: { is: userSearch } },
            { targetUser: { is: userSearch } },
          ],
        }
      : {}),
  };

  const [auditEvents24h, failedLogins24h, lockedCredentials, activePrivilegedSessions, revokedSessions24h, sessions, lockedCredentialRows, loginAttempts, rawAuditRows] =
    await Promise.all([
      prisma.auditLog.count({
        where: { createdAt: { gte: dayStart } },
      }),
      prisma.loginAttempt.count({
        where: {
          success: false,
          createdAt: { gte: dayStart },
        },
      }),
      prisma.credential.count({
        where: {
          lockedUntil: { gt: now },
        },
      }),
      prisma.session.count({
        where: {
          revokedAt: null,
          expiresAt: { gt: now },
          user: { AND: [realUserWhere, privilegedUserSearch] },
        },
      }),
      prisma.session.count({
        where: {
          revokedAt: { gte: dayStart },
        },
      }),
      prisma.session.findMany({
        where: {
          revokedAt: null,
          expiresAt: { gt: now },
          user: sessionUserWhere,
          ...(q
            ? {
                OR: [
                  { ip: { contains: q, mode: "insensitive" } },
                  { userAgent: { contains: q, mode: "insensitive" } },
                  { deviceLabel: { contains: q, mode: "insensitive" } },
                  { user: userSearch },
                ],
              }
            : {}),
        },
        orderBy: { lastSeenAt: "desc" },
        take: 25,
        select: {
          id: true,
          userId: true,
          ip: true,
          userAgent: true,
          deviceLabel: true,
          createdAt: true,
          lastSeenAt: true,
          expiresAt: true,
          user: {
            select: {
              displayName: true,
              identifiers: {
                where: { type: "EMAIL", isPrimary: true },
                select: { value: true },
                take: 1,
              },
              roles: {
                select: {
                  role: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.credential.findMany({
        where: {
          lockedUntil: { gt: now },
          ...(q ? { user: userSearch } : {}),
        },
        orderBy: { lockedUntil: "desc" },
        take: 20,
        select: {
          failedAttempts: true,
          lockedUntil: true,
          user: {
            select: {
              id: true,
              displayName: true,
              identifiers: {
                where: { type: "EMAIL", isPrimary: true },
                select: { value: true },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.loginAttempt.findMany({
        where: {
          ...(failedOnly ? { success: false } : {}),
          ...(q
            ? {
                OR: [
                  { identifierValue: { contains: q, mode: "insensitive" } },
                  { userAgent: { contains: q, mode: "insensitive" } },
                  { user: userSearch },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          userId: true,
          identifierValue: true,
          success: true,
          failureReason: true,
          userAgent: true,
          createdAt: true,
          user: {
            select: {
              displayName: true,
              identifiers: {
                where: { type: "EMAIL", isPrimary: true },
                select: { value: true },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.auditLog.findMany({
        where: auditWhere,
        orderBy: { createdAt: "desc" },
        take: 120,
        select: {
          id: true,
          category: true,
          action: true,
          targetUserId: true,
          targetType: true,
          createdAt: true,
          meta: true,
          actor: { select: { displayName: true } },
          targetUser: { select: { displayName: true } },
        },
      }),
    ]);

  const filteredAuditRows = rawAuditRows.filter((row) => {
    const metaSummary = summarizeAuditMeta(row.meta);
    return !(
      containsDemoIdentityText(row.actor?.displayName) ||
      containsDemoIdentityText(row.targetUser?.displayName) ||
      containsDemoIdentityText(metaSummary)
    );
  });

  const auditRowsTotal = filteredAuditRows.length;
  const auditTotalPages = Math.max(1, Math.ceil(auditRowsTotal / auditPageSize));
  const safeAuditPage = Math.min(auditPage, auditTotalPages);
  const auditSkip = (safeAuditPage - 1) * auditPageSize;
  const auditRows = filteredAuditRows.slice(auditSkip, auditSkip + auditPageSize);
  const sessionRowsTotal = sessions.length;
  const sessionTotalPages = Math.max(1, Math.ceil(sessionRowsTotal / sessionPageSize));
  const safeSessionPage = Math.min(sessionPage, sessionTotalPages);
  const sessionSkip = (safeSessionPage - 1) * sessionPageSize;
  const paginatedSessions = sessions.slice(sessionSkip, sessionSkip + sessionPageSize);

  return {
    filters: {
      q,
      category,
      failedOnly,
      privilegedOnly,
      sessionPage: safeSessionPage,
      auditPage: safeAuditPage,
    },
    summary: {
      auditEvents24h,
      failedLogins24h,
      lockedCredentials,
      activePrivilegedSessions,
      revokedSessions24h,
    },
    sessions: paginatedSessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      displayName: session.user.displayName ?? "Unnamed member",
      primaryEmail: session.user.identifiers[0]?.value ?? null,
      roles: session.user.roles.map((assignment) => assignment.role.name),
      ip: session.ip ?? null,
      userAgent: session.userAgent ?? null,
      deviceLabel: session.deviceLabel ?? null,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt,
    })),
    sessionPagination: {
      total: sessionRowsTotal,
      totalPages: sessionTotalPages,
      start: sessionRowsTotal === 0 ? 0 : sessionSkip + 1,
      end: sessionRowsTotal === 0 ? 0 : Math.min(sessionSkip + sessionPageSize, sessionRowsTotal),
    },
    lockedCredentialsRows: lockedCredentialRows.map((row) => ({
      userId: row.user.id,
      displayName: row.user.displayName ?? "Unnamed member",
      primaryEmail: row.user.identifiers[0]?.value ?? null,
      failedAttempts: row.failedAttempts,
      lockedUntil: row.lockedUntil ?? now,
    })),
    loginAttemptRows: loginAttempts.map((attempt) => ({
      id: attempt.id,
      userId: attempt.userId,
      displayName: attempt.user?.displayName ?? null,
      primaryEmail: attempt.user?.identifiers[0]?.value ?? null,
      identifierValue: attempt.identifierValue ?? null,
      success: attempt.success,
      failureReason: attempt.failureReason ?? null,
      userAgent: attempt.userAgent ?? null,
      createdAt: attempt.createdAt,
    })),
    auditRows: auditRows.map((row) => ({
      id: row.id,
      category: row.category,
      action: row.action,
      actorName: row.actor?.displayName ?? null,
      targetUserId: row.targetUserId ?? null,
      targetUserName: row.targetUser?.displayName ?? null,
      targetType: row.targetType ?? null,
      createdAt: row.createdAt,
      metaSummary: summarizeAuditMeta(row.meta),
    })),
    auditPagination: {
      total: auditRowsTotal,
      totalPages: auditTotalPages,
      start: auditRowsTotal === 0 ? 0 : auditSkip + 1,
      end: auditRowsTotal === 0 ? 0 : Math.min(auditSkip + auditPageSize, auditRowsTotal),
    },
  };
}

export async function getAdminSystemJobsData(): Promise<AdminSystemJobsData> {
  const now = new Date();
  const staleThreshold = daysAgo(now, 1);
  const last7Start = daysAgo(now, 7);

  const [
    pendingFiles,
    failedFiles,
    oldestPendingFile,
    pendingSummaries,
    failedSummaries,
    oldestPendingSummary,
    openVerificationRequests,
    oldestVerification,
    pendingCaseReview,
    oldestPendingCase,
    openReports,
    oldestOpenReport,
    openAlerts,
    oldestOpenAlert,
    notificationsToday,
    moderationActions7d,
    verificationReviewed7d,
    publishedCases7d,
  ] = await Promise.all([
    prisma.fileAsset.count({
      where: { scanStatus: FileScanStatus.PENDING },
    }),
    prisma.fileAsset.count({
      where: { scanStatus: FileScanStatus.FAILED },
    }),
    prisma.fileAsset.findFirst({
      where: { scanStatus: FileScanStatus.PENDING },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.discussionAISummary.count({
      where: {
        status: SummaryStatus.PENDING,
        isCurrent: true,
      },
    }),
    prisma.discussionAISummary.count({
      where: {
        status: SummaryStatus.FAILED,
        isCurrent: true,
      },
    }),
    prisma.discussionAISummary.findFirst({
      where: {
        status: SummaryStatus.PENDING,
        isCurrent: true,
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.lawyerVerificationRequest.count({
      where: {
        status: { in: [LawyerVerificationStatus.PENDING, LawyerVerificationStatus.UNDER_REVIEW] },
      },
    }),
    prisma.lawyerVerificationRequest.findFirst({
      where: {
        status: { in: [LawyerVerificationStatus.PENDING, LawyerVerificationStatus.UNDER_REVIEW] },
      },
      orderBy: { submittedAt: "asc" },
      select: { submittedAt: true },
    }),
    prisma.caseRecord.count({
      where: { status: RepositoryItemStatus.PENDING_REVIEW },
    }),
    prisma.caseRecord.findFirst({
      where: { status: RepositoryItemStatus.PENDING_REVIEW },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.contentReport.count({
      where: { status: { in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW] } },
    }),
    prisma.contentReport.findFirst({
      where: { status: { in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW] } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.aIAlert.count({
      where: { status: { in: [AIAlertStatus.OPEN, AIAlertStatus.ACKNOWLEDGED] } },
    }),
    prisma.aIAlert.findFirst({
      where: { status: { in: [AIAlertStatus.OPEN, AIAlertStatus.ACKNOWLEDGED] } },
      orderBy: { detectedAt: "asc" },
      select: { detectedAt: true },
    }),
    prisma.notification.count({
      where: { createdAt: { gte: startOfDay(now) } },
    }),
    prisma.moderationAction.count({
      where: { createdAt: { gte: last7Start } },
    }),
    prisma.lawyerVerificationRequest.count({
      where: {
        reviewedAt: { gte: last7Start },
      },
    }),
    prisma.caseRecord.count({
      where: {
        publishedAt: { gte: last7Start },
      },
    }),
  ]);

  const dbQueues: AdminSystemJobsData["dbQueues"] = [
    {
      key: "file_scanning",
      title: "File scanning backlog",
      count: pendingFiles,
      oldestAge: oldestPendingFile ? formatAgeLabel(oldestPendingFile.createdAt, now) : "None",
      href: "/files?scanStatus=PENDING",
      detail: `${failedFiles} failed scans require separate investigation`,
      status: oldestPendingFile && oldestPendingFile.createdAt < staleThreshold ? "attention" : "healthy",
    },
    {
      key: "ai_summaries",
      title: "AI summary generation",
      count: pendingSummaries,
      oldestAge: oldestPendingSummary ? formatAgeLabel(oldestPendingSummary.createdAt, now) : "None",
      href: "/moderation?tab=alerts",
      detail: `${failedSummaries} current summaries are in failed state`,
      status: oldestPendingSummary && oldestPendingSummary.createdAt < staleThreshold ? "attention" : "healthy",
    },
    {
      key: "verification_review",
      title: "Verification review queue",
      count: openVerificationRequests,
      oldestAge: oldestVerification ? formatAgeLabel(oldestVerification.submittedAt, now) : "None",
      href: "/verification?status=PENDING",
      detail: "Pending and under-review lawyer verification requests",
      status: oldestVerification && oldestVerification.submittedAt < staleThreshold ? "attention" : "healthy",
    },
    {
      key: "case_review",
      title: "Case publication review",
      count: pendingCaseReview,
      oldestAge: oldestPendingCase ? formatAgeLabel(oldestPendingCase.createdAt, now) : "None",
      href: "/case-review?status=PENDING_REVIEW",
      detail: "Repository items waiting for reviewer action",
      status: oldestPendingCase && oldestPendingCase.createdAt < staleThreshold ? "attention" : "healthy",
    },
    {
      key: "reports",
      title: "Moderation reports",
      count: openReports,
      oldestAge: oldestOpenReport ? formatAgeLabel(oldestOpenReport.createdAt, now) : "None",
      href: "/moderation?tab=reports",
      detail: "Open and under-review reports requiring triage",
      status: oldestOpenReport && oldestOpenReport.createdAt < staleThreshold ? "attention" : "healthy",
    },
    {
      key: "ai_alerts",
      title: "AI risk alerts",
      count: openAlerts,
      oldestAge: oldestOpenAlert ? formatAgeLabel(oldestOpenAlert.detectedAt, now) : "None",
      href: "/moderation?tab=alerts",
      detail: "Open and acknowledged alerts not yet fully resolved",
      status: oldestOpenAlert && oldestOpenAlert.detectedAt < staleThreshold ? "attention" : "healthy",
    },
  ];

  return {
    generatedAt: now,
    summary: {
      pendingFileScans: pendingFiles,
      failedFileScans: failedFiles,
      pendingAiSummaries: pendingSummaries,
      failedAiSummaries: failedSummaries,
      pendingVerification: openVerificationRequests,
      pendingCaseReview,
    },
    dbQueues,
    throughput: [
      {
        label: "Notifications today",
        value: `${notificationsToday}`,
        detail: "In-app notification records created since the start of the day",
      },
      {
        label: "Moderation actions / 7d",
        value: `${moderationActions7d}`,
        detail: "Actions already written to the enforcement ledger",
      },
      {
        label: "Verification decisions / 7d",
        value: `${verificationReviewed7d}`,
        detail: "Requests reviewed in the last 7 days",
      },
      {
        label: "Published cases / 7d",
        value: `${publishedCases7d}`,
        detail: "Repository records published in the last 7 days",
      },
    ],
    unsupportedSurfaces: [
      {
        title: "Search indexing freshness",
        detail: "No indexing job table or provider telemetry is modeled in the current Prisma schema, so freshness and failed index jobs still require external instrumentation.",
        status: "not_modeled",
      },
      {
        title: "Outbound email delivery",
        detail: "The notification ledger exists, but campaign queues, delivery attempts, bounces, and provider health still need a dedicated email subsystem.",
        status: "not_modeled",
      },
      {
        title: "Provider and infrastructure health",
        detail: "Storage, malware scanning, OAuth providers, database latency, and queue-worker health belong in external monitoring rather than this database-backed admin surface.",
        status: "external",
      },
      {
        title: "Reindex and cache controls",
        detail: "Manual reindex or cache-flush commands should be backed by an explicit job or settings service before the portal exposes them as operational controls.",
        status: "external",
      },
    ],
  };
}

export async function getAdminReportsData(filters: AdminReportsFilters = {}): Promise<AdminReportsData> {
  const now = new Date();
  const rangeDays = normalizeReportsRangeDays(filters.range);
  const bucket = normalizeReportsBucket(filters.bucket);
  const rankingLimit = normalizeReportsRankingLimit(filters.rankingLimit);
  const realUserWhere = buildRealUserWhere();
  const { rangeStart, buckets } = buildReportBuckets(now, rangeDays, bucket);
  const todayStart = startOfDay(now);
  const comparisonWindowDays = bucket === "week" ? 7 : Math.min(30, rangeDays);
  const currentComparisonStart = daysAgo(todayStart, comparisonWindowDays - 1);
  const previousComparisonStart = daysAgo(todayStart, comparisonWindowDays * 2 - 1);
  const openReportStatuses = [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW];
  const openAlertStatuses = [AIAlertStatus.OPEN, AIAlertStatus.ACKNOWLEDGED];

  const [
    users,
    discussions,
    answers,
    comments,
    cases,
    publishedCases,
    verificationRequests,
    approvedLawyers,
    rejectedVerifications,
    reports,
    alerts,
    actions,
    openReports,
    openAlerts,
    regionCases,
    courtCases,
    categoryCases,
    tagMetrics,
    oldestPendingCase,
    oldestOpenReport,
    oldestVerification,
    oldestAlert,
    failedLoginsCurrent7,
    failedLoginsPrevious7,
    reportsCurrent7,
    reportsPrevious7,
    fileFailuresCurrent7,
    fileFailuresPrevious7,
    publishedCurrent7,
    publishedPrevious7,
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        createdAt: { gte: rangeStart },
        ...realUserWhere,
      },
      select: { createdAt: true },
    }),
    prisma.discussion.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true } }),
    prisma.answer.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true } }),
    prisma.comment.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true } }),
    prisma.caseRecord.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true } }),
    prisma.caseRecord.findMany({
      where: { publishedAt: { gte: rangeStart }, status: RepositoryItemStatus.PUBLISHED },
      select: { publishedAt: true, region: { select: { name: true } }, court: { select: { name: true } }, category: { select: { name: true } } },
    }),
    prisma.lawyerVerificationRequest.findMany({
      where: {
        lawyerProfile: {
          is: {
            user: realUserWhere,
          },
        },
        submittedAt: { gte: rangeStart },
      },
      select: { submittedAt: true },
    }),
    prisma.lawyerProfile.findMany({
      where: {
        verifiedAt: { gte: rangeStart },
        verificationStatus: LawyerVerificationStatus.VERIFIED,
        user: realUserWhere,
      },
      select: { verifiedAt: true },
    }),
    prisma.lawyerVerificationRequest.findMany({
      where: {
        lawyerProfile: {
          is: {
            user: realUserWhere,
          },
        },
        status: LawyerVerificationStatus.REJECTED,
        reviewedAt: { gte: rangeStart },
      },
      select: { reviewedAt: true },
    }),
    prisma.contentReport.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    prisma.aIAlert.findMany({
      where: { detectedAt: { gte: rangeStart } },
      select: { detectedAt: true },
    }),
    prisma.moderationAction.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    prisma.contentReport.count({ where: { status: { in: openReportStatuses } } }),
    prisma.aIAlert.count({ where: { status: { in: openAlertStatuses } } }),
    prisma.caseRecord.findMany({
      where: { status: RepositoryItemStatus.PUBLISHED, publishedAt: { not: null } },
      select: { region: { select: { name: true } } },
    }),
    prisma.caseRecord.findMany({
      where: { status: RepositoryItemStatus.PUBLISHED, publishedAt: { not: null } },
      select: { court: { select: { name: true } } },
    }),
    prisma.caseRecord.findMany({
      where: { status: RepositoryItemStatus.PUBLISHED, publishedAt: { not: null } },
      select: { category: { select: { name: true } } },
    }),
    prisma.tagMetricDaily.findMany({
      where: { metricDate: { gte: rangeStart } },
      orderBy: [{ engagementScore: "desc" }],
      take: Math.max(10, rankingLimit),
      select: {
        engagementScore: true,
        tag: { select: { name: true } },
      },
    }),
    prisma.caseRecord.findFirst({
      where: { status: RepositoryItemStatus.PENDING_REVIEW },
      orderBy: { createdAt: "asc" },
      select: { slug: true, title: true, createdAt: true },
    }),
    prisma.contentReport.findFirst({
      where: { status: { in: openReportStatuses } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.lawyerVerificationRequest.findFirst({
      where: {
        lawyerProfile: {
          is: {
            user: realUserWhere,
          },
        },
        status: { in: [LawyerVerificationStatus.PENDING, LawyerVerificationStatus.UNDER_REVIEW] },
      },
      orderBy: { submittedAt: "asc" },
      select: { submittedAt: true },
    }),
    prisma.aIAlert.findFirst({
      where: { status: { in: openAlertStatuses } },
      orderBy: { detectedAt: "asc" },
      select: { detectedAt: true },
    }),
    prisma.loginAttempt.count({
      where: { success: false, createdAt: { gte: currentComparisonStart } },
    }),
    prisma.loginAttempt.count({
      where: { success: false, createdAt: { gte: previousComparisonStart, lt: currentComparisonStart } },
    }),
    prisma.contentReport.count({
      where: { createdAt: { gte: currentComparisonStart } },
    }),
    prisma.contentReport.count({
      where: { createdAt: { gte: previousComparisonStart, lt: currentComparisonStart } },
    }),
    prisma.fileAsset.count({
      where: { scanStatus: { in: [FileScanStatus.FAILED, FileScanStatus.INFECTED] }, createdAt: { gte: currentComparisonStart } },
    }),
    prisma.fileAsset.count({
      where: {
        scanStatus: { in: [FileScanStatus.FAILED, FileScanStatus.INFECTED] },
        createdAt: { gte: previousComparisonStart, lt: currentComparisonStart },
      },
    }),
    prisma.caseRecord.count({
      where: { status: RepositoryItemStatus.PUBLISHED, publishedAt: { gte: currentComparisonStart } },
    }),
    prisma.caseRecord.count({
      where: { status: RepositoryItemStatus.PUBLISHED, publishedAt: { gte: previousComparisonStart, lt: currentComparisonStart } },
    }),
  ]);

  const userGrowthCounts = bucketDates(users.map((item) => item.createdAt), buckets);
  const discussionCounts = bucketDates(discussions.map((item) => item.createdAt), buckets);
  const answerCounts = bucketDates(answers.map((item) => item.createdAt), buckets);
  const commentCounts = bucketDates(comments.map((item) => item.createdAt), buckets);
  const caseCounts = bucketDates(cases.map((item) => item.createdAt), buckets);
  const verificationSubmittedCounts = bucketDates(verificationRequests.map((item) => item.submittedAt), buckets);
  const verificationApprovedCounts = bucketDates(approvedLawyers.map((item) => item.verifiedAt), buckets);
  const verificationRejectedCounts = bucketDates(rejectedVerifications.map((item) => item.reviewedAt), buckets);
  const reportCounts = bucketDates(reports.map((item) => item.createdAt), buckets);
  const alertCounts = bucketDates(alerts.map((item) => item.detectedAt), buckets);
  const actionCounts = bucketDates(actions.map((item) => item.createdAt), buckets);

  const approvedInRange = approvedLawyers.filter((item) => item.verifiedAt && item.verifiedAt >= rangeStart).length;
  const rejectedInRange = rejectedVerifications.filter((item) => item.reviewedAt && item.reviewedAt >= rangeStart).length;
  const verificationApprovalRateInRange =
    approvedInRange + rejectedInRange === 0 ? null : Math.round((approvedInRange / (approvedInRange + rejectedInRange)) * 100);

  const publishedCasesInRange = publishedCases.filter((item) => item.publishedAt && item.publishedAt >= rangeStart).length;

  const aggregateLabels = (items: Array<{ label: string | null }>) =>
    Array.from(
      items.reduce((map, item) => {
        const label = item.label ?? "Unassigned";
        map.set(label, (map.get(label) ?? 0) + 1);
        return map;
      }, new Map<string, number>()),
    )
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, rankingLimit);

  const summaryNotes = [
    `User growth ${percentChange(
      userGrowthCounts[userGrowthCounts.length - 1] ?? 0,
      userGrowthCounts[userGrowthCounts.length - 2] ?? 0,
    ).toFixed(0)}% versus the prior ${bucket} bucket.`,
    `${publishedCasesInRange} cases were published in the last ${rangeDays} days, with ${openReports + openAlerts} open moderation signals platform-wide.`,
    verificationApprovalRateInRange === null
      ? `Verification approval rate is not available yet for the last ${rangeDays} days.`
      : `Verification approval rate is ${verificationApprovalRateInRange}% across decided requests in the last ${rangeDays} days.`,
  ];

  const anomalies: AdminReportsData["anomalies"] = [
    {
      label: "Reports volume",
      detail: `${reportsCurrent7} in the last ${comparisonWindowDays} days vs ${reportsPrevious7} in the prior ${comparisonWindowDays} days`,
      status: reportsCurrent7 > Math.max(3, reportsPrevious7 * 1.5) ? "warning" : "stable",
    },
    {
      label: "Failed logins",
      detail: `${failedLoginsCurrent7} in the last ${comparisonWindowDays} days vs ${failedLoginsPrevious7} in the prior ${comparisonWindowDays} days`,
      status: failedLoginsCurrent7 > Math.max(5, failedLoginsPrevious7 * 1.5) ? "warning" : "stable",
    },
    {
      label: "File scan failures",
      detail: `${fileFailuresCurrent7} in the last ${comparisonWindowDays} days vs ${fileFailuresPrevious7} in the prior ${comparisonWindowDays} days`,
      status: fileFailuresCurrent7 > Math.max(2, fileFailuresPrevious7 * 1.5) ? "warning" : "stable",
    },
    {
      label: "Case publication velocity",
      detail: `${publishedCurrent7} published in the last ${comparisonWindowDays} days vs ${publishedPrevious7} in the prior ${comparisonWindowDays} days`,
      status: publishedPrevious7 >= 4 && publishedCurrent7 < publishedPrevious7 / 2 ? "warning" : "stable",
    },
  ];

  return {
    generatedAt: now,
    filters: {
      rangeDays,
      bucket,
      rankingLimit,
    },
    summary: {
      newUsersInRange: users.length,
      publishedCasesInRange,
      openModerationSignals: openReports + openAlerts,
      verificationApprovalRateInRange,
    },
    summaryNotes,
    userGrowth: buckets.map((bucket, index) => ({
      label: bucket.label,
      users: userGrowthCounts[index] ?? 0,
    })),
    contentCreation: buckets.map((bucket, index) => ({
      label: bucket.label,
      discussions: discussionCounts[index] ?? 0,
      answers: answerCounts[index] ?? 0,
      comments: commentCounts[index] ?? 0,
      cases: caseCounts[index] ?? 0,
    })),
    verificationThroughput: buckets.map((bucket, index) => ({
      label: bucket.label,
      submitted: verificationSubmittedCounts[index] ?? 0,
      approved: verificationApprovedCounts[index] ?? 0,
      rejected: verificationRejectedCounts[index] ?? 0,
    })),
    moderationLoad: buckets.map((bucket, index) => ({
      label: bucket.label,
      reports: reportCounts[index] ?? 0,
      alerts: alertCounts[index] ?? 0,
      actions: actionCounts[index] ?? 0,
    })),
    rankings: {
      regions: aggregateLabels(regionCases.map((item) => ({ label: item.region?.name ?? null }))),
      courts: aggregateLabels(courtCases.map((item) => ({ label: item.court?.name ?? null }))),
      categories: aggregateLabels(categoryCases.map((item) => ({ label: item.category.name }))),
      tags: tagMetrics
        .slice(0, rankingLimit)
        .map((item) => ({
          label: item.tag.name,
          score: item.engagementScore === null ? 0 : Number(item.engagementScore),
        })),
    },
    queueAging: [
      {
        label: "Oldest pending case",
        value: oldestPendingCase ? formatAgeLabel(oldestPendingCase.createdAt, now) : "None",
        href: oldestPendingCase ? buildCaseReviewHref(oldestPendingCase.slug) : "/case-review",
      },
      {
        label: "Oldest unresolved report",
        value: oldestOpenReport ? formatAgeLabel(oldestOpenReport.createdAt, now) : "None",
        href: "/moderation?tab=reports",
      },
      {
        label: "Oldest verification request",
        value: oldestVerification ? formatAgeLabel(oldestVerification.submittedAt, now) : "None",
        href: "/verification?status=PENDING",
      },
      {
        label: "Oldest unreviewed AI alert",
        value: oldestAlert ? formatAgeLabel(oldestAlert.detectedAt, now) : "None",
        href: "/moderation?tab=alerts",
      },
    ],
    anomalies,
  };
}
