"use client";
/* eslint-disable @next/next/no-img-element */

import {
  persistTheme,
  readStoredTheme,
  resolveTheme,
  THEME_EVENT_NAME,
  type ThemeMode,
} from "@/lib/theme";
import {
  ArrowLeft,
  Camera,
  Eye,
  EyeOff,
  ExternalLink,
  Linkedin,
  LockKeyhole,
  Mail,
  Monitor,
  Moon,
  Pencil,
  SunMedium,
  Trash2,
  UserRound,
} from "lucide-react";
import Tooltip from "@/app/components/ui/tooltip";
import { optimizeProfileImage } from "@/lib/optimize-profile-image";
import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";

interface ProfileSaveResult {
  success: boolean;
}

interface ProfilePageProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
    linkedInUrl?: string;
    occupation?: string;
  };
  variant?: "lawyer" | "admin";
  onSave?: (
    data:
      | { name: string; avatarUrl?: string; linkedInUrl?: string; occupation?: string }
      | { currentPassword: string; newPassword: string }
  ) => Promise<ProfileSaveResult>;
}

type PasswordField = "currentPassword" | "newPassword" | "confirmPassword";

const OCCUPATION_OPTIONS = [
  "Other",
  "Lawyer",
  "Advocate",
  "Legal Consultant",
  "Paralegal",
  "Law Student",
];

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "U";

  return trimmed
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ThemeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-[16px] px-4 py-3 text-sm font-semibold transition ${
        active
          ? "bg-[var(--primary)] text-white shadow-[0_18px_30px_rgba(76,47,94,0.2)]"
          : "bg-transparent text-[var(--foreground)] hover:bg-[var(--background-surface)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function DetailCard({
  icon,
  label,
  content,
}: {
  icon: React.ReactNode;
  label: string;
  content: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--background-surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[var(--background-card-nested)] text-[var(--primary)]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--heading)]">{label}</p>
          <div className="mt-4 min-w-0">{content}</div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage({
  user,
  variant = "lawyer",
  onSave,
}: ProfilePageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [showPasswords, setShowPasswords] = useState<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [formData, setFormData] = useState({
    name: user.name,
    avatarUrl: user.avatarUrl ?? "",
    linkedInUrl: user.linkedInUrl ?? "",
    occupation: user.occupation ?? (variant === "lawyer" ? "Lawyer" : "Other"),
  });
  const [displayData, setDisplayData] = useState({
    name: user.name,
    avatarUrl: user.avatarUrl ?? "",
    linkedInUrl: user.linkedInUrl ?? "",
    occupation: user.occupation ?? (variant === "lawyer" ? "Lawyer" : "Other"),
  });
  const [passwordForm, setPasswordForm] = useState<Record<PasswordField, string>>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const occupation = user.occupation ?? (variant === "lawyer" ? "Lawyer" : "Other");
    setFormData({
      name: user.name,
      avatarUrl: user.avatarUrl ?? "",
      linkedInUrl: user.linkedInUrl ?? "",
      occupation,
    });
    setDisplayData({
      name: user.name,
      avatarUrl: user.avatarUrl ?? "",
      linkedInUrl: user.linkedInUrl ?? "",
      occupation,
    });
  }, [user, variant]);

  useEffect(() => {
    const syncThemeState = () => {
      const stored = readStoredTheme();
      setThemePreference(stored);
      setResolvedTheme(resolveTheme(stored));
    };

    syncThemeState();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (readStoredTheme() === "system") syncThemeState();
    };
    const handleThemeChange = () => syncThemeState();

    mediaQuery.addEventListener("change", handleSystemChange);
    window.addEventListener(THEME_EVENT_NAME, handleThemeChange as EventListener);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemChange);
      window.removeEventListener(THEME_EVENT_NAME, handleThemeChange as EventListener);
    };
  }, []);

  const passwordFields: Array<{ label: string; field: PasswordField }> = [
    { label: "Current Password", field: "currentPassword" },
    { label: "New Password", field: "newPassword" },
    { label: "Confirm Password", field: "confirmPassword" },
  ];

  const themeSummary =
    themePreference === "system"
      ? `System mode is active and currently using ${resolvedTheme}.`
      : `${themePreference[0].toUpperCase()}${themePreference.slice(1)} mode is active.`;
  const previewData = isEditing ? formData : displayData;

  const resetPasswordForm = () => {
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowPasswords({ currentPassword: false, newPassword: false, confirmPassword: false });
  };

  const handleThemeSelect = (mode: ThemeMode) => {
    setThemePreference(mode);
    setResolvedTheme(resolveTheme(mode));
    persistTheme(mode);
  };

  const togglePasswordVisibility = (field: PasswordField) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleAvatarPick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const result = await optimizeProfileImage(file, {
        maxWidth: 512,
        maxHeight: 512,
        targetBytes: 300 * 1024,
      });

      setFormData((prev) => ({ ...prev, avatarUrl: result }));
      setIsEditing(true);
    } catch (error) {
      alert(getErrorMessage(error, "Failed to process the selected image."));
    } finally {
      input.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setFormData((prev) => ({ ...prev, avatarUrl: "" }));
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      alert("Name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave({
          name: trimmedName,
          avatarUrl: formData.avatarUrl.trim(),
          linkedInUrl: formData.linkedInUrl.trim(),
          ...(variant === "lawyer" ? { occupation: formData.occupation } : {}),
        });
      }

      setDisplayData({
        name: trimmedName,
        avatarUrl: formData.avatarUrl.trim(),
        linkedInUrl: formData.linkedInUrl.trim(),
        occupation: formData.occupation,
      });
      setIsEditing(false);
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Failed to update profile. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (!passwordForm.currentPassword) return alert("Please enter your current password");
    if (!passwordForm.newPassword) return alert("Please enter a new password");
    if (passwordForm.newPassword.length < 8) {
      return alert("New password must be at least 8 characters");
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return alert("New passwords do not match");
    }

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        });
      }
      setShowPasswordModal(false);
      resetPasswordForm();
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Failed to update password. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const resetEditState = () => {
    setIsEditing(false);
    setFormData({
      name: displayData.name,
      avatarUrl: displayData.avatarUrl,
      linkedInUrl: displayData.linkedInUrl,
      occupation: displayData.occupation,
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(159,99,196,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(76,47,94,0.12),transparent_26%),var(--background-page)]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      <div className="mx-auto max-w-[1180px] px-4 pb-10 pt-6 md:px-6">
        <div className="flex items-center gap-4">
          {variant === "lawyer" ? (
            <Tooltip content="Back to discussions">
              <Link
                href="/discussions"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--background-surface)] text-[var(--foreground)] shadow-[var(--shadow-card)] transition hover:bg-[var(--background-card-nested)]"
                aria-label="Back to discussions"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Tooltip>
          ) : null}
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[var(--heading)]">
            Profile Settings
          </h1>
        </div>

        <div className="mt-6 rounded-[34px] border border-[var(--border-subtle)] bg-[var(--background-surface)] p-4 shadow-[var(--shadow-elevated)] md:p-6">
          <section className="overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.14)] bg-[linear-gradient(135deg,#3A2348_0%,#59356E_50%,#8F66AD_100%)] px-5 py-6 text-white md:px-7 md:py-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleAvatarPick}
                  className="group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[28px] border border-white/20 bg-white/12 text-white shadow-[0_24px_40px_rgba(0,0,0,0.18)] transition hover:scale-[1.02]"
                  aria-label="Upload profile picture"
                >
                  {previewData.avatarUrl.trim() ? (
                    <img
                      src={previewData.avatarUrl}
                      alt={previewData.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[28px] font-semibold tracking-[-0.04em]">
                      {getInitials(previewData.name)}
                    </span>
                  )}
                  <span className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#1f1427]/65 text-white backdrop-blur-sm">
                    <Camera className="h-4 w-4" />
                  </span>
                </button>

                <div className="min-w-0">
                  <h2 className="mt-1 truncate text-[28px] font-semibold tracking-[-0.04em] text-white">
                    {previewData.name}
                  </h2>
                  <div className="mt-4 flex flex-col gap-4 text-sm text-white/80 sm:flex-row sm:flex-wrap sm:items-center">
                    <span className="inline-flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </span>
                    {variant === "lawyer" && previewData.linkedInUrl.trim() ? (
                      <a
                        href={previewData.linkedInUrl.trim()}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-white transition hover:text-white/85"
                      >
                        <Linkedin className="h-4 w-4" />
                        Open LinkedIn
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>

              {isEditing ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={resetEditState}
                    className="min-w-[140px] rounded-full border border-white/16 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/14"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="min-w-[140px] rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#4C2F5E] transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/16 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/14"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Profile
                </button>
              )}
            </div>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <DetailCard
              icon={<UserRound className="h-5 w-5" />}
              label="Name"
              content={
                isEditing ? (
                  <div className="flex items-center gap-3 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--background-card-nested)] px-4 py-3">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full border-0 bg-transparent p-0 text-[15px] text-[var(--heading)] outline-none"
                    />
                    <Pencil className="h-4 w-4 shrink-0 text-[var(--icon-muted)]" />
                  </div>
                ) : (
                  <span className="text-[16px] font-medium text-[var(--heading)]">
                    {displayData.name}
                  </span>
                )
              }
            />

            <DetailCard
              icon={<Mail className="h-5 w-5" />}
              label="Email"
              content={
                <span className="break-all text-[15px] text-[var(--foreground)]">{user.email}</span>
              }
            />

            {variant === "lawyer" ? (
              <DetailCard
                icon={<UserRound className="h-5 w-5" />}
                label="Occupation"
                content={
                  isEditing ? (
                    <select
                      value={formData.occupation}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, occupation: e.target.value }))
                      }
                      className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--background-card-nested)] px-4 py-3 text-[15px] text-[var(--heading)] outline-none focus:border-[var(--primary)]"
                    >
                      {OCCUPATION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[15px] text-[var(--heading)]">{displayData.occupation}</span>
                  )
                }
              />
            ) : null}

            <DetailCard
              icon={<Camera className="h-5 w-5" />}
              label="Profile picture"
              content={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleAvatarPick}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-[15px] font-medium text-white transition hover:opacity-90"
                  >
                    <Camera className="h-4 w-4" />
                    {previewData.avatarUrl.trim() ? "Change Photo" : "Upload Photo"}
                  </button>

                  {previewData.avatarUrl.trim() ? (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--background-surface)] px-4 py-2.5 text-[15px] font-medium text-[var(--foreground)] transition hover:bg-[var(--background-card-nested)]"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  ) : (
                    <span className="text-[15px] text-[var(--text-muted)]">
                      No profile picture added yet.
                    </span>
                  )}
                </div>
              }
            />

            {variant === "lawyer" ? (
              <DetailCard
                icon={<Linkedin className="h-5 w-5" />}
                label="LinkedIn"
                content={
                  isEditing ? (
                    <div className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--background-card-nested)] px-4 py-3">
                      <input
                        type="url"
                        placeholder="https://www.linkedin.com/in/your-profile"
                        value={formData.linkedInUrl}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, linkedInUrl: e.target.value }))
                        }
                        className="w-full border-0 bg-transparent p-0 text-[15px] text-[var(--heading)] outline-none"
                      />
                    </div>
                  ) : previewData.linkedInUrl.trim() ? (
                    <a
                      href={previewData.linkedInUrl.trim()}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 break-all text-[15px] font-medium text-[var(--primary)] transition hover:opacity-80"
                    >
                      {previewData.linkedInUrl.trim()}
                      <ExternalLink className="h-4 w-4 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-[15px] text-[var(--text-muted)]">
                      No LinkedIn URL added yet.
                    </span>
                  )
                }
              />
            ) : null}

            <DetailCard
              icon={<LockKeyhole className="h-5 w-5" />}
              label="Password"
              content={
                isEditing ? (
                  <button
                    type="button"
                    onClick={() => {
                      resetPasswordForm();
                      setShowPasswordModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--background-card-nested)] px-4 py-2.5 text-[15px] font-medium text-[var(--primary)] transition hover:bg-[var(--background-page)]"
                  >
                    <Pencil className="h-4 w-4" />
                    Change Password
                  </button>
                ) : (
                  <span className="text-[15px] tracking-[0.24em] text-[var(--foreground)]">
                    **********
                  </span>
                )
              }
            />
          </section>

          <section className="mt-8 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--background-card-nested)] p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--heading)]">Appearance</h2>
              </div>
              <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--background-surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                {themeSummary}
              </div>
            </div>

            <div className="mt-5 rounded-[18px] bg-[var(--background-surface)] p-2 shadow-[var(--shadow-card)]">
              <div className="flex flex-col gap-2 sm:flex-row">
                <ThemeButton
                  active={themePreference === "light"}
                  icon={<SunMedium className="h-4 w-4" />}
                  label="Light"
                  onClick={() => handleThemeSelect("light")}
                />
                <ThemeButton
                  active={themePreference === "dark"}
                  icon={<Moon className="h-4 w-4" />}
                  label="Dark"
                  onClick={() => handleThemeSelect("dark")}
                />
                <ThemeButton
                  active={themePreference === "system"}
                  icon={<Monitor className="h-4 w-4" />}
                  label="System"
                  onClick={() => handleThemeSelect("system")}
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {showPasswordModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[440px] rounded-[30px] border border-[var(--border-subtle)] bg-[var(--background-surface)] p-7 shadow-[var(--shadow-elevated)]">
            <h3 className="text-[20px] font-semibold text-[var(--heading)]">Change Password</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Confirm your current password before setting a new one.
            </p>

            <div className="mt-6 space-y-5">
              {passwordFields.map(({ label, field }) => {
                const isVisible = showPasswords[field];

                return (
                  <div key={field}>
                    <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                      {label}
                    </label>
                    <div className="relative">
                      <input
                        type={isVisible ? "text" : "password"}
                        value={passwordForm[field]}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }))
                        }
                        autoComplete="new-password"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        className="w-full rounded-[16px] border border-[var(--border-subtle)] bg-[var(--background-surface)] py-3 pl-4 pr-12 text-[15px] text-[var(--heading)] outline-none transition focus:border-[var(--primary)]"
                      />
                      <Tooltip content={isVisible ? "Hide password" : "Show password"}>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(field)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--icon-muted)] transition hover:text-[var(--primary)]"
                          aria-label={isVisible ? "Hide password" : "Show password"}
                        >
                          {isVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  resetPasswordForm();
                }}
                className="flex-1 rounded-full border border-[var(--border-subtle)] bg-[var(--background-surface)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background-card-nested)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePassword}
                disabled={isSaving}
                className="flex-1 rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
