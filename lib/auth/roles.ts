export const ADMIN_PERMISSION_KEYS = {
  DASHBOARD_VIEW: "admin.dashboard.view",
  PROFILE_VIEW_SELF: "admin.profile.view.self",
  PROFILE_EDIT_SELF: "admin.profile.edit.self",
  REPORTS_VIEW: "reports.view",
  EXPORTS_VIEW: "reports.export",
  USERS_MANAGE: "users.status.manage",
  ROLES_MANAGE: "user_roles.manage",
  PERMISSIONS_MANAGE: "role_permissions.manage",
  VERIFICATION_REVIEW: "verification.queue.view",
  SECURITY_MANAGE: "settings.edit",
  CASE_REVIEW: "cases.review.queue.view",
  DISCUSSIONS_MANAGE: "discussions.admin.view_all",
  MODERATION_MANAGE: "moderation.queue.view",
  FILES_MANAGE: "settings.edit",
  NOTIFICATIONS_MANAGE: "notifications.admin.audit",
  SYSTEM_JOBS_VIEW: "settings.view",
  TAXONOMY_MANAGE: "settings.edit",
  GAMIFICATION_MANAGE: "reports.analytics.view",
  ORGANIZATIONS_MANAGE: "settings.edit",
} as const;

export const LAWYER_PERMISSION_KEYS = {
  ACCOUNT_VIEW_SELF: "account.view.self",
  ACCOUNT_EDIT_SELF: "account.edit.self",
  ACCOUNT_PASSWORD_CHANGE_SELF: "account.password.change.self",
  PROFILE_VIEW_SELF: "profile.view.self",
  PROFILE_SETUP_SELF: "profile.setup.self",
  PROFILE_EDIT_SELF: "profile.edit.self",
  PROFILE_STATS_VIEW_SELF: "profile.stats.view.self",
  PROFILE_VISIBILITY_MANAGE_SELF: "profile.visibility.manage.self",
  PROFILE_PUBLIC_VIEW: "profile.public.view",
  PROFILE_VIEW_TRACK: "profile.view.track",
  DISCUSSIONS_VIEW: "discussions.view",
  DISCUSSIONS_CREATE: "discussions.create",
  DISCUSSIONS_EDIT_OWN: "discussions.edit.own",
  DISCUSSIONS_DELETE_OWN: "discussions.delete.own",
  DISCUSSIONS_VIEW_OWN: "discussions.view.own",
  DISCUSSIONS_VIEW_SAVED_OWN: "discussions.view.saved_own",
  DISCUSSIONS_BOOKMARK: "discussions.bookmark",
  DISCUSSIONS_FOLLOW: "discussions.follow",
  DISCUSSIONS_REACT: "discussions.react",
  DISCUSSIONS_AI_SUMMARY_VIEW: "discussions.ai_summary.view",
  ANSWERS_VIEW: "answers.view",
  ANSWERS_CREATE: "answers.create",
  ANSWERS_REACT: "answers.react",
  ANSWERS_ACCEPT_ON_OWN_DISCUSSION: "answers.accept.on_own_discussion",
  COMMENTS_VIEW: "comments.view",
  COMMENTS_CREATE: "comments.create",
  COMMENTS_REACT: "comments.react",
  NOTIFICATIONS_VIEW_SELF: "notifications.view.self",
  NOTIFICATIONS_MARK_READ_SELF: "notifications.mark_read.self",
  CASES_VIEW: "cases.view",
  CASES_META_VIEW: "cases.meta.view",
  CASES_CREATE_DRAFT: "cases.create.draft",
  CASES_VIEW_OWN_DASHBOARD: "cases.view.own_dashboard",
  CASES_VIEW_OWN_UNPUBLISHED: "cases.view.own_unpublished",
  CASES_EDIT_OWN: "cases.edit.own",
  CASES_SUBMIT_OWN_FOR_REVIEW: "cases.submit.own_for_review",
  CASES_BOOKMARK: "cases.bookmark",
  CASES_VIEW_SAVED_OWN: "cases.view.saved_own",
  CASES_SHARE: "cases.share",
  SAVED_VIEW_SELF: "saved.view.self",
  TOPICS_VIEW_SELF: "topics.view.self",
} as const;

export type AdminPermissionKey = (typeof ADMIN_PERMISSION_KEYS)[keyof typeof ADMIN_PERMISSION_KEYS];
export type LawyerPermissionKey = (typeof LAWYER_PERMISSION_KEYS)[keyof typeof LAWYER_PERMISSION_KEYS];
export type PermissionRequirement =
  | string
  | {
      any: string[];
    }
  | {
      all: string[];
    };
type RoutePermissionRule<TPermission> = {
  matches: (pathname: string) => boolean;
  path: string;
  permission: TPermission;
};

const ADMIN_PORTAL_ROLES = new Set(["admin", "super_admin", "superadmin"]);
const LAWYER_PORTAL_ROLES = new Set(["lawyer", "lawyer_user", "lawyeruser"]);

function matchesExactOrChild(prefix: string) {
  return (pathname: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isLawyerPublicPath(pathname: string) {
  if (pathname === "/discussions" || pathname === "/cases") {
    return true;
  }

  if (/^\/discussions\/[^/]+$/.test(pathname)) {
    return true;
  }

  if (/^\/cases\/[^/]+$/.test(pathname)) {
    return true;
  }

  return false;
}

const ADMIN_ROUTE_PERMISSION_RULES: RoutePermissionRule<AdminPermissionKey>[] = [
  { path: "/dashboard", matches: matchesExactOrChild("/dashboard"), permission: ADMIN_PERMISSION_KEYS.DASHBOARD_VIEW },
  { path: "/reports", matches: matchesExactOrChild("/reports"), permission: ADMIN_PERMISSION_KEYS.REPORTS_VIEW },
  { path: "/exports", matches: matchesExactOrChild("/exports"), permission: ADMIN_PERMISSION_KEYS.EXPORTS_VIEW },
  { path: "/user", matches: matchesExactOrChild("/user"), permission: ADMIN_PERMISSION_KEYS.USERS_MANAGE },
  { path: "/roles", matches: matchesExactOrChild("/roles"), permission: ADMIN_PERMISSION_KEYS.ROLES_MANAGE },
  { path: "/permissions", matches: matchesExactOrChild("/permissions"), permission: ADMIN_PERMISSION_KEYS.PERMISSIONS_MANAGE },
  { path: "/verification", matches: matchesExactOrChild("/verification"), permission: ADMIN_PERMISSION_KEYS.VERIFICATION_REVIEW },
  { path: "/settings", matches: matchesExactOrChild("/settings"), permission: ADMIN_PERMISSION_KEYS.SECURITY_MANAGE },
  { path: "/case-review", matches: matchesExactOrChild("/case-review"), permission: ADMIN_PERMISSION_KEYS.CASE_REVIEW },
  { path: "/discussion-ops", matches: matchesExactOrChild("/discussion-ops"), permission: ADMIN_PERMISSION_KEYS.DISCUSSIONS_MANAGE },
  { path: "/moderation", matches: matchesExactOrChild("/moderation"), permission: ADMIN_PERMISSION_KEYS.MODERATION_MANAGE },
  { path: "/files", matches: matchesExactOrChild("/files"), permission: ADMIN_PERMISSION_KEYS.FILES_MANAGE },
  { path: "/notifications", matches: matchesExactOrChild("/notifications"), permission: ADMIN_PERMISSION_KEYS.NOTIFICATIONS_MANAGE },
  { path: "/system-jobs", matches: matchesExactOrChild("/system-jobs"), permission: ADMIN_PERMISSION_KEYS.SYSTEM_JOBS_VIEW },
  { path: "/taxonomy", matches: matchesExactOrChild("/taxonomy"), permission: ADMIN_PERMISSION_KEYS.TAXONOMY_MANAGE },
  { path: "/gamification", matches: matchesExactOrChild("/gamification"), permission: ADMIN_PERMISSION_KEYS.GAMIFICATION_MANAGE },
  { path: "/organizations", matches: matchesExactOrChild("/organizations"), permission: ADMIN_PERMISSION_KEYS.ORGANIZATIONS_MANAGE },
];

const LAWYER_ROUTE_PERMISSION_RULES: RoutePermissionRule<PermissionRequirement>[] = [
  { path: "/profile/notifications", matches: matchesExactOrChild("/profile/notifications"), permission: LAWYER_PERMISSION_KEYS.NOTIFICATIONS_VIEW_SELF },
  { path: "/profile/setup", matches: matchesExactOrChild("/profile/setup"), permission: LAWYER_PERMISSION_KEYS.PROFILE_SETUP_SELF },
  { path: "/profile/edit", matches: matchesExactOrChild("/profile/edit"), permission: LAWYER_PERMISSION_KEYS.PROFILE_EDIT_SELF },
  { path: "/profile/stats", matches: matchesExactOrChild("/profile/stats"), permission: LAWYER_PERMISSION_KEYS.PROFILE_STATS_VIEW_SELF },
  { path: "/profile", matches: matchesExactOrChild("/profile"), permission: LAWYER_PERMISSION_KEYS.PROFILE_VIEW_SELF },
  {
    path: "/topics",
    matches: matchesExactOrChild("/topics"),
    permission: {
      all: [LAWYER_PERMISSION_KEYS.TOPICS_VIEW_SELF, LAWYER_PERMISSION_KEYS.DISCUSSIONS_VIEW_OWN],
    },
  },
  {
    path: "/saved",
    matches: matchesExactOrChild("/saved"),
    permission: {
      all: [LAWYER_PERMISSION_KEYS.SAVED_VIEW_SELF, LAWYER_PERMISSION_KEYS.DISCUSSIONS_VIEW_SAVED_OWN],
    },
  },
  {
    path: "/cases/new",
    matches: matchesExactOrChild("/cases/new"),
    permission: {
      all: [LAWYER_PERMISSION_KEYS.CASES_CREATE_DRAFT, LAWYER_PERMISSION_KEYS.CASES_META_VIEW],
    },
  },
  { path: "/cases/mine", matches: matchesExactOrChild("/cases/mine"), permission: LAWYER_PERMISSION_KEYS.CASES_VIEW_OWN_DASHBOARD },
  { path: "/cases/saved", matches: matchesExactOrChild("/cases/saved"), permission: LAWYER_PERMISSION_KEYS.CASES_VIEW_SAVED_OWN },
  {
    path: "/cases",
    matches: (pathname) => /^\/cases\/[^/]+\/edit(?:\/|$)/.test(pathname),
    permission: {
      all: [LAWYER_PERMISSION_KEYS.CASES_EDIT_OWN, LAWYER_PERMISSION_KEYS.CASES_META_VIEW],
    },
  },
  { path: "/cases", matches: matchesExactOrChild("/cases"), permission: LAWYER_PERMISSION_KEYS.CASES_VIEW },
  { path: "/discussions", matches: matchesExactOrChild("/discussions"), permission: LAWYER_PERMISSION_KEYS.DISCUSSIONS_VIEW },
];

export function normalizeRoleName(roleName: string) {
  return roleName.trim().toLowerCase();
}

export function canAccessAdminPortal(roles: string[]) {
  return roles.some((role) => ADMIN_PORTAL_ROLES.has(normalizeRoleName(role)));
}

export function canAccessLawyerPortal(roles: string[]) {
  return roles.some((role) => LAWYER_PORTAL_ROLES.has(normalizeRoleName(role)));
}

export function resolveEffectivePermissions(roles: string[], assignedPermissionKeys: string[] = []) {
  const normalizedAssigned = Array.from(
    new Set(
      assignedPermissionKeys
        .map((permissionKey) => permissionKey.trim())
        .filter(Boolean),
    ),
  ).sort();
  void roles;
  return normalizedAssigned;
}

export function hasPermission(permissionKeys: string[], permissionKey: string) {
  return permissionKeys.includes(permissionKey);
}

export function hasAnyPermission(permissionKeys: string[], permissionRequirements: string[]) {
  return permissionRequirements.some((permissionKey) => hasPermission(permissionKeys, permissionKey));
}

export function canAccessPermissionRequirement(permissionKeys: string[], permissionRequirement: PermissionRequirement) {
  if (typeof permissionRequirement === "string") {
    return hasPermission(permissionKeys, permissionRequirement);
  }

  if ("any" in permissionRequirement) {
    return hasAnyPermission(permissionKeys, permissionRequirement.any);
  }

  return permissionRequirement.all.every((permissionKey) => hasPermission(permissionKeys, permissionKey));
}

export function canAccessAdminPermission(roles: string[], permissionKeys: string[], permissionKey: string) {
  if (!canAccessAdminPortal(roles)) {
    return false;
  }

  return hasPermission(resolveEffectivePermissions(roles, permissionKeys), permissionKey);
}

export function canAccessLawyerPermission(roles: string[], permissionKeys: string[], permissionKey: string) {
  if (!canAccessLawyerPortal(roles)) {
    return false;
  }

  return hasPermission(resolveEffectivePermissions(roles, permissionKeys), permissionKey);
}

export function getAdminPermissionForPath(pathname: string): AdminPermissionKey | null {
  const matchedRule = ADMIN_ROUTE_PERMISSION_RULES.find((rule) => rule.matches(pathname));

  return matchedRule?.permission ?? null;
}

export function getLawyerPermissionForPath(pathname: string): PermissionRequirement | null {
  if (isLawyerPublicPath(pathname)) {
    return null;
  }

  const matchedRule = LAWYER_ROUTE_PERMISSION_RULES.find((rule) => rule.matches(pathname));

  return matchedRule?.permission ?? null;
}

export function canAccessLawyerPath(roles: string[], permissionKeys: string[], pathname: string) {
  if (isLawyerPublicPath(pathname)) {
    return true;
  }

  if (!canAccessLawyerPortal(roles)) {
    return false;
  }

  const requiredPermission = getLawyerPermissionForPath(pathname);
  if (!requiredPermission) {
    return true;
  }

  return canAccessPermissionRequirement(resolveEffectivePermissions(roles, permissionKeys), requiredPermission);
}

export function getFirstAccessibleAdminPath(roles: string[], permissionKeys: string[]) {
  if (!canAccessAdminPortal(roles)) {
    return null;
  }

  const matchedRule = ADMIN_ROUTE_PERMISSION_RULES.find((rule) =>
    canAccessAdminPermission(roles, permissionKeys, rule.permission as AdminPermissionKey),
  );

  return matchedRule?.path ?? "/adminprofile";
}

export function getFirstAccessibleLawyerPath(roles: string[], permissionKeys: string[]) {
  if (!canAccessLawyerPortal(roles)) {
    return null;
  }

  const effectivePermissions = resolveEffectivePermissions(roles, permissionKeys);
  const matchedRule = LAWYER_ROUTE_PERMISSION_RULES.find((rule) =>
    canAccessPermissionRequirement(effectivePermissions, rule.permission),
  );

  return matchedRule?.path ?? "/discussions";
}
