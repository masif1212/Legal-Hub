import { prisma } from '@/lib/prisma';
import { upsertUserActivityDaily } from '@/lib/services/user-activity';
import type { CaseCommentItem, CaseReactionType, CaseRepositoryRecord, CaseSourceType, CaseVisibility } from '@/types/case';
import { createHash, randomUUID } from 'crypto';
import { mkdir, rm, writeFile } from 'fs/promises';
import { Prisma, RepositoryItemStatus } from '@prisma/client';
import path from 'path';

const CASE_SUBMISSION_POINTS = 12;

export interface CreateCaseDraftInput {
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
  tagSlugs?: string[];
  regionSlug?: string;
  courtSlug?: string;
  organizationId?: string;
  visibility?: CaseVisibility;
  sourceType?: CaseSourceType;
  sourceLinks?: Array<{ label?: string; sourceName?: string; url: string }>;
  citations?: string[];
  intent?: 'draft' | 'submit';
}

const caseRecordInclude = {
  author: {
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      profile: {
        select: {
          username: true,
          isLawyer: true,
          headline: true,
          primaryRegion: { select: { name: true } },
        },
      },
      identifiers: {
        where: { type: 'EMAIL', isPrimary: true },
        select: { value: true },
        take: 1,
      },
      lawyerProfile: {
        select: {
          verificationStatus: true,
          firmName: true,
          barCouncil: true,
        },
      },
    },
  },
  reviewedBy: {
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      profile: {
        select: {
          username: true,
          isLawyer: true,
          headline: true,
          primaryRegion: { select: { name: true } },
        },
      },
      identifiers: {
        where: { type: 'EMAIL', isPrimary: true },
        select: { value: true },
        take: 1,
      },
      lawyerProfile: {
        select: {
          verificationStatus: true,
          firmName: true,
          barCouncil: true,
        },
      },
    },
  },
  organization: { select: { id: true, name: true } },
  category: { select: { id: true, slug: true, name: true, colorHex: true } },
  tags: { include: { tag: { select: { id: true, slug: true, name: true } } } },
  region: { select: { id: true, slug: true, name: true } },
  court: { select: { id: true, slug: true, name: true, level: true } },
  sourceLinks: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
  sourceFiles: {
    include: {
      asset: {
        select: {
          id: true,
          objectKey: true,
          originalFileName: true,
          mimeType: true,
          fileSize: true,
          createdAt: true,
        },
      },
    },
  },
  bookmarks: { select: { userId: true } },
  followers: { select: { userId: true } },
  reactions: { select: { userId: true, reactionType: true } },
  revisions: {
    include: {
      editor: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          profile: {
            select: {
              username: true,
              isLawyer: true,
              headline: true,
              primaryRegion: { select: { name: true } },
            },
          },
          identifiers: {
            where: { type: 'EMAIL', isPrimary: true },
            select: { value: true },
            take: 1,
          },
          lawyerProfile: { select: { verificationStatus: true, firmName: true, barCouncil: true } },
        },
      },
      reviewedBy: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          profile: {
            select: {
              username: true,
              isLawyer: true,
              headline: true,
              primaryRegion: { select: { name: true } },
            },
          },
          identifiers: {
            where: { type: 'EMAIL', isPrimary: true },
            select: { value: true },
            take: 1,
          },
          lawyerProfile: { select: { verificationStatus: true, firmName: true, barCouncil: true } },
        },
      },
    },
    orderBy: { version: 'desc' },
  },
  citationsMade: {
    include: {
      citedCase: {
        select: {
          slug: true,
          title: true,
          canonicalCitation: true,
          decisionDate: true,
          court: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  },
  citationsReceived: {
    include: {
      sourceCase: {
        select: {
          slug: true,
          title: true,
          canonicalCitation: true,
          decisionDate: true,
          court: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  },
  comments: {
    where: { parentId: null, deletedAt: null },
    include: {
      author: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          profile: {
            select: {
              username: true,
              isLawyer: true,
              headline: true,
              primaryRegion: { select: { name: true } },
            },
          },
          identifiers: {
            where: { type: 'EMAIL', isPrimary: true },
            select: { value: true },
            take: 1,
          },
          lawyerProfile: { select: { verificationStatus: true, firmName: true, barCouncil: true } },
        },
      },
      reactions: { select: { reactionType: true } },
      replies: {
        where: { deletedAt: null },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              profile: {
                select: {
                  username: true,
                  isLawyer: true,
                  headline: true,
                  primaryRegion: { select: { name: true } },
                },
              },
              identifiers: {
                where: { type: 'EMAIL', isPrimary: true },
                select: { value: true },
                take: 1,
              },
              lawyerProfile: { select: { verificationStatus: true, firmName: true, barCouncil: true } },
            },
          },
          reactions: { select: { reactionType: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  },
  reports: { select: { id: true } },
  aiAlerts: { select: { id: true } },
  moderationActions: {
    select: {
      id: true,
      actionType: true,
      reason: true,
      note: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  },
  discussionThreads: {
    select: {
      id: true,
      slug: true,
      title: true,
      answerCount: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  },
} satisfies Prisma.CaseRecordInclude;

type CaseRecordWithRelations = Prisma.CaseRecordGetPayload<{ include: typeof caseRecordInclude }>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function uniqueSlug(base: string) {
  const normalized = slugify(base) || `case-${Date.now()}`;
  let candidate = normalized;
  let counter = 1;

  while (await prisma.caseRecord.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${normalized}-${counter++}`;
  }

  return candidate;
}

function sanitizeFilename(value: string) {
  const normalized = value.trim().replace(/[/\\?%*:|"<>]/g, '-');
  return normalized.length ? normalized : 'attachment';
}

function buildPublicAssetUrl(objectKey: string) {
  return `/${objectKey.replace(/\\/g, '/')}`;
}

async function cleanupUploadedFiles(filePaths: string[]) {
  await Promise.all(
    filePaths.map((filePath) =>
      rm(filePath, { force: true }).catch(() => undefined),
    ),
  );
}

async function persistCaseSourceFiles(
  tx: Prisma.TransactionClient,
  {
    caseId,
    uploaderId,
    files,
    writtenFilePaths,
  }: {
    caseId: string;
    uploaderId: string;
    files: File[];
    writtenFilePaths: string[];
  },
) {
  if (!files.length) return;

  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const baseDir = path.join(process.cwd(), 'public', 'uploads', 'case-source-files', year, month);

  await mkdir(baseDir, { recursive: true });

  for (const file of files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const checksumSha256 = createHash('sha256').update(bytes).digest('hex');
    const safeOriginalName = sanitizeFilename(file.name);
    const objectName = `${randomUUID()}-${safeOriginalName}`;
    const absolutePath = path.join(baseDir, objectName);
    const objectKey = path.posix.join('uploads', 'case-source-files', year, month, objectName);

    await writeFile(absolutePath, bytes);
    writtenFilePaths.push(absolutePath);

    const asset = await tx.fileAsset.create({
      data: {
        uploaderId,
        storageProvider: 'local',
        bucket: 'public',
        objectKey,
        originalFileName: safeOriginalName,
        mimeType: file.type || null,
        fileSize: file.size,
        checksumSha256,
        scanStatus: 'PENDING',
        isPublic: true,
      },
      select: { id: true },
    });

    await tx.caseSourceFile.create({
      data: {
        caseId,
        assetId: asset.id,
        label: safeOriginalName,
      },
    });
  }
}

const defaultRepositoryRegions = [
  { slug: 'pakistan', name: 'Pakistan (All)', type: 'COUNTRY', sortOrder: 1 },
  { slug: 'punjab', name: 'Punjab', type: 'PROVINCE', sortOrder: 2 },
  { slug: 'sindh', name: 'Sindh', type: 'PROVINCE', sortOrder: 3 },
  { slug: 'kpk', name: 'Khyber Pakhtunkhwa', type: 'PROVINCE', sortOrder: 4 },
  { slug: 'balochistan', name: 'Balochistan', type: 'PROVINCE', sortOrder: 5 },
  { slug: 'islamabad', name: 'Islamabad', type: 'CITY', sortOrder: 6 },
  { slug: 'karachi', name: 'Karachi', type: 'CITY', sortOrder: 7 },
  { slug: 'lahore', name: 'Lahore', type: 'CITY', sortOrder: 8 },
  { slug: 'peshawar', name: 'Peshawar', type: 'CITY', sortOrder: 9 },
  { slug: 'quetta', name: 'Quetta', type: 'CITY', sortOrder: 10 },
  { slug: 'multan', name: 'Multan', type: 'CITY', sortOrder: 11 },
  { slug: 'faisalabad', name: 'Faisalabad', type: 'CITY', sortOrder: 12 },
] as const;

const defaultRepositoryCourts = [
  {
    slug: 'supreme-court-of-pakistan',
    name: 'Supreme Court of Pakistan',
    level: 'SUPREME',
    regionSlug: 'pakistan',
    websiteUrl: 'https://www.supremecourt.gov.pk',
  },
  {
    slug: 'islamabad-high-court',
    name: 'Islamabad High Court',
    level: 'HIGH',
    regionSlug: 'islamabad',
    websiteUrl: 'https://ihc.gov.pk',
  },
  {
    slug: 'lahore-high-court',
    name: 'Lahore High Court',
    level: 'HIGH',
    regionSlug: 'lahore',
    websiteUrl: 'https://lhc.gov.pk',
  },
  {
    slug: 'sindh-high-court',
    name: 'Sindh High Court',
    level: 'HIGH',
    regionSlug: 'karachi',
    websiteUrl: 'https://www.sindhhighcourt.gov.pk',
  },
  {
    slug: 'peshawar-high-court',
    name: 'Peshawar High Court',
    level: 'HIGH',
    regionSlug: 'peshawar',
    websiteUrl: 'https://peshawarhighcourt.gov.pk',
  },
  {
    slug: 'balochistan-high-court',
    name: 'Balochistan High Court',
    level: 'HIGH',
    regionSlug: 'quetta',
    websiteUrl: 'https://bhc.gov.pk',
  },
  {
    slug: 'lahore-district-court',
    name: 'District Courts Lahore',
    level: 'DISTRICT',
    regionSlug: 'lahore',
    websiteUrl: null,
  },
  {
    slug: 'karachi-city-court',
    name: 'City Courts Karachi',
    level: 'DISTRICT',
    regionSlug: 'karachi',
    websiteUrl: null,
  },
  {
    slug: 'peshawar-district-court',
    name: 'District Judiciary Peshawar',
    level: 'DISTRICT',
    regionSlug: 'peshawar',
    websiteUrl: null,
  },
  {
    slug: 'quetta-district-court',
    name: 'District Judiciary Quetta',
    level: 'DISTRICT',
    regionSlug: 'quetta',
    websiteUrl: null,
  },
] as const;

async function ensureRepositoryMetaSeeded(viewerId?: string | null) {
  const activeRegionCount = await prisma.region.count({ where: { isActive: true } });

  if (activeRegionCount === 0) {
    await prisma.region.createMany({
      data: defaultRepositoryRegions.map((region) => ({
        slug: region.slug,
        name: region.name,
        type: region.type,
        countryCode: 'PK',
        sortOrder: region.sortOrder,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }

  const activeCourtCount = await prisma.court.count({ where: { isActive: true } });

  if (activeCourtCount === 0) {
    const regionRows = await prisma.region.findMany({
      where: { isActive: true },
      select: { id: true, slug: true },
    });
    const regionIds = new Map(regionRows.map((region) => [region.slug, region.id]));

    await prisma.court.createMany({
      data: defaultRepositoryCourts
        .map((court) => ({
          slug: court.slug,
          name: court.name,
          level: court.level,
          regionId: regionIds.get(court.regionSlug) ?? null,
          websiteUrl: court.websiteUrl,
          isActive: true,
        }))
        .filter((court) => court.regionId),
      skipDuplicates: true,
    });
  }

  if (!viewerId) return;

  const existingOrganization = await prisma.organization.findFirst({
    where: {
      OR: [{ ownerId: viewerId }, { members: { some: { userId: viewerId, status: 'ACTIVE' } } }],
    },
    select: { id: true },
  });

  if (existingOrganization) return;

  const user = await prisma.user.findUnique({
    where: { id: viewerId },
    select: {
      id: true,
      displayName: true,
      lawyerProfile: { select: { firmName: true } },
    },
  });

  if (!user) return;

  const organizationName =
    user.lawyerProfile?.firmName?.trim() || `${(user.displayName ?? 'Legal Hub User').trim()} Chambers`;

  let organizationSlug = slugify(organizationName) || `organization-${viewerId.slice(-8)}`;
  let suffix = 1;

  while (await prisma.organization.findUnique({ where: { slug: organizationSlug }, select: { id: true } })) {
    organizationSlug = `${slugify(organizationName) || 'organization'}-${suffix++}`;
  }

  const organization = await prisma.organization.create({
    data: {
      slug: organizationSlug,
      name: organizationName,
      type: 'LAW_FIRM',
      visibility: 'PRIVATE',
      ownerId: viewerId,
    },
    select: { id: true },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: viewerId,
      },
    },
    update: {
      role: 'OWNER',
      status: 'ACTIVE',
    },
    create: {
      organizationId: organization.id,
      userId: viewerId,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });
}

function bytesLabel(size?: number | null) {
  if (!size) return 'Unknown size';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function toCaseReactionType(value?: string | null): CaseReactionType | null {
  if (value === 'LIKE' || value === 'UPVOTE' || value === 'DOWNVOTE' || value === 'HELPFUL' || value === 'INSIGHTFUL') {
    return value;
  }
  return null;
}

function buildCommentNode(comment: CaseRecordWithRelations['comments'][number]): CaseCommentItem {
  const tally = (reactions: Array<{ reactionType: string }>) => {
    const map = new Map<string, number>();
    for (const reaction of reactions) {
      map.set(reaction.reactionType, (map.get(reaction.reactionType) ?? 0) + 1);
    }

    return Array.from(map.entries()).map(([type, count]) => ({
      type: type as CaseCommentItem['reactions'][number]['type'],
      count,
    }));
  };

  return {
    id: comment.id,
    author: {
      id: comment.author.id,
      displayName: comment.author.displayName ?? 'Legal Hub User',
      email: comment.author.identifiers[0]?.value ?? null,
      avatarUrl: comment.author.avatarUrl,
      username: comment.author.profile?.username ?? null,
      headline: comment.author.profile?.headline ?? null,
      organizationName: comment.author.lawyerProfile?.firmName ?? null,
      isLawyer: comment.author.profile?.isLawyer ?? Boolean(comment.author.lawyerProfile),
      isVerifiedLawyer: comment.author.lawyerProfile?.verificationStatus === 'VERIFIED',
      firmName: comment.author.lawyerProfile?.firmName ?? null,
      barCouncil: comment.author.lawyerProfile?.barCouncil ?? null,
      regionName: comment.author.profile?.primaryRegion?.name ?? null,
    },
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    editedAt: comment.updatedAt.getTime() !== comment.createdAt.getTime() ? comment.updatedAt.toISOString() : null,
    reactions: tally(comment.reactions),
    replies: comment.replies.map((reply) =>
      ({
        id: reply.id,
        author: {
          id: reply.author.id,
          displayName: reply.author.displayName ?? 'Legal Hub User',
          email: reply.author.identifiers[0]?.value ?? null,
          avatarUrl: reply.author.avatarUrl,
          username: reply.author.profile?.username ?? null,
          headline: reply.author.profile?.headline ?? null,
          organizationName: reply.author.lawyerProfile?.firmName ?? null,
          isLawyer: reply.author.profile?.isLawyer ?? Boolean(reply.author.lawyerProfile),
          isVerifiedLawyer: reply.author.lawyerProfile?.verificationStatus === 'VERIFIED',
          firmName: reply.author.lawyerProfile?.firmName ?? null,
          barCouncil: reply.author.lawyerProfile?.barCouncil ?? null,
          regionName: reply.author.profile?.primaryRegion?.name ?? null,
        },
        body: reply.body,
        createdAt: reply.createdAt.toISOString(),
        editedAt: reply.updatedAt.getTime() !== reply.createdAt.getTime() ? reply.updatedAt.toISOString() : null,
        reactions: tally(reply.reactions),
      }) satisfies CaseCommentItem,
    ),
  };
}

export function mapCaseRecord(record: CaseRecordWithRelations, viewerId?: string | null): CaseRepositoryRecord {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    canonicalCitation: record.canonicalCitation ?? 'Citation pending',
    summary: record.summary ?? 'Summary not yet provided.',
    facts: record.facts ?? 'Facts not yet documented.',
    issues: record.issues ?? 'Issues not yet documented.',
    holding: record.holding ?? 'Holding not yet documented.',
    outcome: record.outcome ?? 'Outcome not yet documented.',
    proceduralHistory: record.proceduralHistory ?? 'Procedural history not yet documented.',
    docketNumber: record.docketNumber ?? null,
    category: {
      id: record.category.slug,
      name: record.category.name,
      colorHex: record.category.colorHex,
    },
    tags: record.tags.map((item) => ({ id: item.tag.slug, name: item.tag.name })),
    region: record.region ? { id: record.region.slug, name: record.region.name } : null,
    court: record.court
      ? {
          id: record.court.slug,
          name: record.court.name,
          level: record.court.level,
        }
      : null,
    status: record.status,
    visibility: record.visibility,
    sourceType: record.sourceType,
    author: {
      id: record.author.id,
      displayName: record.author.displayName ?? 'Legal Hub User',
      email: record.author.identifiers[0]?.value ?? null,
      avatarUrl: record.author.avatarUrl,
      username: record.author.profile?.username ?? null,
      headline: record.author.profile?.headline ?? null,
      organizationName: record.organization?.name ?? record.author.lawyerProfile?.firmName ?? null,
      isLawyer: record.author.profile?.isLawyer ?? Boolean(record.author.lawyerProfile),
      isVerifiedLawyer: record.author.lawyerProfile?.verificationStatus === 'VERIFIED',
      firmName: record.author.lawyerProfile?.firmName ?? null,
      barCouncil: record.author.lawyerProfile?.barCouncil ?? null,
      regionName: record.author.profile?.primaryRegion?.name ?? record.region?.name ?? null,
    },
    organization: record.organization,
    decisionDate: record.decisionDate?.toISOString() ?? null,
    filedDate: record.filedDate?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    publishedAt: record.publishedAt?.toISOString() ?? null,
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
    trustLabel:
      record.sourceType === 'OFFICIAL_COURT'
        ? 'Verified from official court material'
        : record.status === 'PUBLISHED'
          ? 'Published after repository review'
          : 'Contributor draft awaiting repository review',
    provenanceLabel:
      record.sourceLinks.length > 0
        ? `${record.sourceLinks.length} linked source${record.sourceLinks.length === 1 ? '' : 's'}`
        : 'No source links attached yet',
    counts: {
      views: record.viewCount,
      comments: record.commentCount,
      saves: record.bookmarkCount,
      follows: record.followerCount,
      reactions: record.reactionCount,
      outboundCitations: record.citationsMade.length,
      inboundCitations: record.citationsReceived.length,
    },
    viewerState: {
      saved: viewerId ? record.bookmarks.some((bookmark) => bookmark.userId === viewerId) : false,
      followed: viewerId ? record.followers.some((follow) => follow.userId === viewerId) : false,
      reaction: viewerId ? toCaseReactionType(record.reactions.find((reaction) => reaction.userId === viewerId)?.reactionType) : null,
    },
    sourceLinks: record.sourceLinks.map((link) => ({
      id: link.id,
      label: link.label ?? link.sourceName ?? 'Source link',
      sourceName: link.sourceName ?? 'External source',
      url: link.url,
      publishedAt: link.publishedAt?.toISOString() ?? null,
      isPrimary: link.isPrimary,
    })),
    sourceFiles: record.sourceFiles.map((file) => ({
      id: file.id,
      label: file.label ?? file.asset.originalFileName,
      filename: file.asset.originalFileName,
      fileType: file.asset.mimeType ?? 'Unknown',
      fileSizeLabel: bytesLabel(file.asset.fileSize),
      uploadedAt: file.createdAt.toISOString(),
      url: buildPublicAssetUrl(file.asset.objectKey),
    })),
    revisions: record.revisions.map((revision) => ({
      id: revision.id,
      version: revision.version,
      status: revision.status,
      createdAt: revision.createdAt.toISOString(),
      changeSummary: revision.changeSummary ?? 'Revision saved without summary.',
      editor: {
        id: revision.editor.id,
        displayName: revision.editor.displayName ?? 'Legal Hub User',
        email: revision.editor.identifiers[0]?.value ?? null,
        avatarUrl: revision.editor.avatarUrl,
        username: revision.editor.profile?.username ?? null,
        headline: revision.editor.profile?.headline ?? null,
        organizationName: revision.editor.lawyerProfile?.firmName ?? null,
        isLawyer: revision.editor.profile?.isLawyer ?? Boolean(revision.editor.lawyerProfile),
        isVerifiedLawyer: revision.editor.lawyerProfile?.verificationStatus === 'VERIFIED',
        firmName: revision.editor.lawyerProfile?.firmName ?? null,
        barCouncil: revision.editor.lawyerProfile?.barCouncil ?? null,
        regionName: revision.editor.profile?.primaryRegion?.name ?? null,
      },
      reviewedBy: revision.reviewedBy
        ? {
            id: revision.reviewedBy.id,
            displayName: revision.reviewedBy.displayName ?? 'Reviewer',
            email: revision.reviewedBy.identifiers[0]?.value ?? null,
            avatarUrl: revision.reviewedBy.avatarUrl,
            username: revision.reviewedBy.profile?.username ?? null,
            headline: revision.reviewedBy.profile?.headline ?? null,
            organizationName: revision.reviewedBy.lawyerProfile?.firmName ?? null,
            isLawyer: revision.reviewedBy.profile?.isLawyer ?? Boolean(revision.reviewedBy.lawyerProfile),
            isVerifiedLawyer: revision.reviewedBy.lawyerProfile?.verificationStatus === 'VERIFIED',
            firmName: revision.reviewedBy.lawyerProfile?.firmName ?? null,
            barCouncil: revision.reviewedBy.lawyerProfile?.barCouncil ?? null,
            regionName: revision.reviewedBy.profile?.primaryRegion?.name ?? null,
          }
        : null,
    })),
    citationsMade: record.citationsMade.map((citation) => ({
      id: citation.id,
      slug: citation.citedCase.slug,
      title: citation.citedCase.title,
      canonicalCitation: citation.citedCase.canonicalCitation ?? 'Citation pending',
      court: citation.citedCase.court?.name ?? null,
      decisionDate: citation.citedCase.decisionDate?.toISOString() ?? null,
      relationshipLabel: 'Cited by this case',
      note: citation.citationText ?? null,
    })),
    citationsReceived: record.citationsReceived.map((citation) => ({
      id: citation.id,
      slug: citation.sourceCase.slug,
      title: citation.sourceCase.title,
      canonicalCitation: citation.sourceCase.canonicalCitation ?? 'Citation pending',
      court: citation.sourceCase.court?.name ?? null,
      decisionDate: citation.sourceCase.decisionDate?.toISOString() ?? null,
      relationshipLabel: 'Cites this case',
      note: citation.citationText ?? null,
    })),
    comments: record.comments.map(buildCommentNode),
    relatedDiscussions: record.discussionThreads.map((discussion) => ({
      id: discussion.id,
      slug: discussion.slug,
      title: discussion.title,
      answerCount: discussion.answerCount,
      updatedAt: discussion.updatedAt.toISOString(),
    })),
    moderation: {
      openReports: record.reports.length,
      aiAlerts: record.aiAlerts.length,
      lastReviewerNote:
        record.moderationActions.find((action) => action.note?.trim())?.note ??
        record.moderationActions.find((action) => action.reason?.trim())?.reason ??
        record.revisions.find((revision) => revision.reviewedBy)?.changeSummary ??
        null,
    },
  };
}

export async function listCaseRecords(params: {
  viewerId?: string | null;
  authorId?: string | null;
  includeViewerDrafts?: boolean;
  statuses?: RepositoryItemStatus[];
  search?: string | null;
  category?: string | null;
  tag?: string | null;
  region?: string | null;
  court?: string | null;
  sourceType?: CaseSourceType | null;
  visibility?: CaseVisibility | null;
  organizationId?: string | null;
  savedByUserId?: string | null;
  dateRange?: '30d' | '90d' | '1y' | null;
  sort?: 'relevant' | 'recent' | 'decision_date' | 'views' | 'follows' | 'helpful' | 'cited' | null;
}) {
  const where: Prisma.CaseRecordWhereInput = {
    deletedAt: null,
  };

  if (params.savedByUserId) {
    where.bookmarks = { some: { userId: params.savedByUserId } };
  }

  if (params.statuses?.length) {
    where.status = { in: params.statuses };
  } else if (params.authorId) {
    where.authorId = params.authorId;
  } else if (params.includeViewerDrafts && params.viewerId) {
    where.OR = [{ status: 'PUBLISHED' }, { authorId: params.viewerId }];
  } else {
    where.status = 'PUBLISHED';
  }

  const records = await prisma.caseRecord.findMany({
    where,
    include: {
      ...caseRecordInclude,
    },
    orderBy: [{ updatedAt: 'desc' }],
  });

  const mapped = records.map((record) => mapCaseRecord(record as CaseRecordWithRelations, params.viewerId));
  const term = params.search?.trim().toLowerCase() ?? '';
  const now = Date.now();

  const filtered = mapped.filter((record) => {
    const canSeeNonPublic =
      params.viewerId && record.author.id === params.viewerId;

    if (!canSeeNonPublic) {
      if (record.status !== 'PUBLISHED') return false;
      if (record.visibility !== 'PUBLIC') return false;
    }

    if (term) {
      const haystack = [
        record.title,
        record.summary,
        record.canonicalCitation,
        record.author.displayName,
        record.organization?.name,
        record.category.name,
        record.region?.name,
        record.court?.name,
        ...record.tags.map((tag) => tag.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(term)) return false;
    }

    if (params.category && record.category.id !== params.category) return false;
    if (params.tag && !record.tags.some((tag) => tag.id === params.tag)) return false;
    if (params.region && record.region?.id !== params.region) return false;
    if (params.court && record.court?.id !== params.court) return false;
    if (params.sourceType && record.sourceType !== params.sourceType) return false;
    if (params.visibility && record.visibility !== params.visibility) return false;
    if (params.organizationId && record.organization?.id !== params.organizationId) return false;

    if (params.dateRange && record.decisionDate) {
      const decisionDate = new Date(record.decisionDate).getTime();
      const rangeMs =
        params.dateRange === '30d'
          ? 1000 * 60 * 60 * 24 * 30
          : params.dateRange === '90d'
            ? 1000 * 60 * 60 * 24 * 90
            : 1000 * 60 * 60 * 24 * 365;

      if (decisionDate < now - rangeMs) return false;
    }

    return true;
  });

  const sorted = [...filtered].sort((left, right) => {
    if (params.sort === 'recent') {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }
    if (params.sort === 'decision_date') {
      return new Date(right.decisionDate ?? right.updatedAt).getTime() - new Date(left.decisionDate ?? left.updatedAt).getTime();
    }
    if (params.sort === 'views') {
      return right.counts.views - left.counts.views;
    }
    if (params.sort === 'follows') {
      return right.counts.follows - left.counts.follows;
    }
    if (params.sort === 'helpful') {
      return right.counts.reactions - left.counts.reactions;
    }
    if (params.sort === 'cited') {
      return (right.counts.inboundCitations + right.counts.outboundCitations) - (left.counts.inboundCitations + left.counts.outboundCitations);
    }

    return (right.counts.reactions + right.counts.views) - (left.counts.reactions + left.counts.views);
  });

  return sorted;
}

export async function findCaseRecordBySlug(slug: string, viewerId?: string | null) {
  const record = await prisma.caseRecord.findUnique({
    where: { slug },
    include: {
      ...caseRecordInclude,
    },
  });

  if (!record) return null;
  return mapCaseRecord(record as CaseRecordWithRelations, viewerId);
}

export async function toggleCaseBookmark(slug: string, userId: string) {
  const record = await prisma.caseRecord.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!record) {
    throw new Error('Case not found.');
  }

  const existingBookmark = await prisma.savedCase.findUnique({
    where: {
      caseId_userId: {
        caseId: record.id,
        userId,
      },
    },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    if (existingBookmark) {
      await tx.savedCase.delete({
        where: {
          caseId_userId: {
            caseId: record.id,
            userId,
          },
        },
      });

      await tx.caseRecord.update({
        where: { id: record.id },
        data: {
          bookmarkCount: { decrement: 1 },
        },
      });
    } else {
      await tx.savedCase.create({
        data: {
          caseId: record.id,
          userId,
        },
      });

      await tx.caseRecord.update({
        where: { id: record.id },
        data: {
          bookmarkCount: { increment: 1 },
        },
      });
    }
  });

  return findCaseRecordBySlug(slug, userId);
}

export async function submitCaseRecordForReview(slug: string, userId: string) {
  const record = await prisma.caseRecord.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      authorId: true,
      revisionCount: true,
      canonicalCitation: true,
      summary: true,
      facts: true,
      issues: true,
      holding: true,
      outcome: true,
      proceduralHistory: true,
      sourceLinks: {
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        select: {
          label: true,
          sourceName: true,
          url: true,
        },
      },
      tags: {
        include: {
          tag: {
            select: { slug: true },
          },
        },
      },
      region: {
        select: { slug: true },
      },
      court: {
        select: { slug: true },
      },
      category: {
        select: { slug: true },
      },
      citationsMade: {
        include: {
          citedCase: {
            select: { canonicalCitation: true },
          },
        },
      },
    },
  });

  if (!record) {
    throw new Error('Case not found.');
  }

  if (record.authorId !== userId) {
    throw new Error('Only the case author can submit this record for review.');
  }

  if (!['DRAFT', 'REJECTED'].includes(record.status)) {
    throw new Error('Only draft or rejected records can be submitted for review.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.caseRecord.update({
      where: { id: record.id },
      data: {
        status: 'PENDING_REVIEW',
      },
    });

    await tx.caseRevision.create({
      data: {
        caseId: record.id,
        version: (record.revisionCount ?? 0) + 1,
        editorId: userId,
        status: 'PENDING_REVIEW',
        changeSummary: 'Case record resubmitted for review from the case detail page.',
        snapshot: {
          title: record.title,
          canonicalCitation: record.canonicalCitation,
          summary: record.summary,
          facts: record.facts,
          issues: record.issues,
          holding: record.holding,
          outcome: record.outcome,
          proceduralHistory: record.proceduralHistory,
          categorySlug: record.category.slug,
          tagSlugs: record.tags.map((item) => item.tag.slug),
          regionSlug: record.region?.slug ?? null,
          courtSlug: record.court?.slug ?? null,
          sourceLinks: record.sourceLinks.map((item) => ({
            label: item.label,
            sourceName: item.sourceName,
            url: item.url,
          })),
          citations: record.citationsMade
            .map((item) => item.citedCase.canonicalCitation)
            .filter(Boolean),
        },
      },
    });

    await tx.caseRecord.update({
      where: { id: record.id },
      data: {
        revisionCount: { increment: 1 },
      },
    });
  });

  return findCaseRecordBySlug(slug, userId);
}

export async function updateCaseRecord(slug: string, userId: string, input: CreateCaseDraftInput, files: File[] = []) {
  const record = await prisma.caseRecord.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      authorId: true,
      revisionCount: true,
      canonicalCitation: true,
    },
  });

  if (!record) {
    throw new Error('Case not found.');
  }

  if (record.authorId !== userId) {
    throw new Error('Only the case author can edit this record.');
  }

  if (!['DRAFT', 'REJECTED'].includes(record.status)) {
    throw new Error('Only draft or rejected records can be edited.');
  }

  const category = await prisma.category.findUnique({
    where: { slug: input.categorySlug },
    select: { id: true, slug: true, name: true },
  });

  if (!category) {
    throw new Error('Selected category was not found.');
  }

  const [region, court, organization, tagRows] = await Promise.all([
    input.regionSlug
      ? prisma.region.findUnique({ where: { slug: input.regionSlug }, select: { id: true, slug: true, name: true } })
      : Promise.resolve(null),
    input.courtSlug
      ? prisma.court.findUnique({ where: { slug: input.courtSlug }, select: { id: true, slug: true, name: true } })
      : Promise.resolve(null),
    input.organizationId
      ? prisma.organization.findUnique({ where: { id: input.organizationId }, select: { id: true } })
      : Promise.resolve(null),
    input.tagSlugs?.length
      ? prisma.tag.findMany({ where: { slug: { in: input.tagSlugs } }, select: { id: true, slug: true } })
      : Promise.resolve([]),
  ]);

  const cleanLinks = (input.sourceLinks ?? [])
    .map((item) => ({
      label: item.label?.trim() || null,
      sourceName: item.sourceName?.trim() || null,
      url: item.url.trim(),
    }))
    .filter((item) => item.url.length > 0);

  const cleanCitations = Array.from(new Set((input.citations ?? []).map((item) => item.trim()).filter(Boolean)));
  const cleanCitation = input.canonicalCitation?.trim() || null;
  const cleanTitle = input.title.trim();

  if (!cleanTitle) {
    throw new Error('Case title is required.');
  }

  if (cleanCitation) {
    const existingCitation = await prisma.caseRecord.findUnique({
      where: { canonicalCitation: cleanCitation },
      select: { id: true, title: true },
    });

    if (existingCitation && existingCitation.id !== record.id) {
      throw new Error(
        `Canonical citation "${cleanCitation}" already exists on "${existingCitation.title}". Change the citation or open the existing case.`,
      );
    }
  }

  const nextStatus: RepositoryItemStatus = input.intent === 'submit' ? 'PENDING_REVIEW' : record.status;
  const nextRevisionVersion = (record.revisionCount ?? 0) + 1;

  const writtenFilePaths: string[] = [];

  try {
    await prisma.$transaction(async (tx) => {
      const existingSourceFileCount = await tx.caseSourceFile.count({
        where: { caseId: record.id },
      });

      await tx.caseRecord.update({
        where: { id: record.id },
        data: {
          title: cleanTitle,
          canonicalCitation: cleanCitation,
          docketNumber: input.docketNumber?.trim() || null,
          summary: input.summary?.trim() || null,
          facts: input.facts?.trim() || null,
          issues: input.issues?.trim() || null,
          holding: input.holding?.trim() || null,
          outcome: input.outcome?.trim() || null,
          proceduralHistory: input.proceduralHistory?.trim() || null,
          sourceType: input.sourceType ?? 'USER_SUBMITTED',
          visibility: input.visibility ?? 'PUBLIC',
          status: nextStatus,
          organizationId: organization?.id ?? null,
          primaryCategoryId: category.id,
          regionId: region?.id ?? null,
          courtId: court?.id ?? null,
          sourceCount: cleanLinks.length + existingSourceFileCount + files.length,
          revisionCount: nextRevisionVersion,
          reviewedById: null,
          reviewedAt: null,
        },
      });

      await tx.caseSourceLink.deleteMany({
        where: { caseId: record.id },
      });

      if (cleanLinks.length) {
        await tx.caseSourceLink.createMany({
          data: cleanLinks.map((item, index) => ({
            caseId: record.id,
            label: item.label,
            sourceName: item.sourceName,
            url: item.url,
            isPrimary: index === 0,
          })),
          skipDuplicates: true,
        });
      }

      await tx.caseTag.deleteMany({
        where: { caseId: record.id },
      });

      if (tagRows.length) {
        await tx.caseTag.createMany({
          data: tagRows.map((tag) => ({
            caseId: record.id,
            tagId: tag.id,
          })),
          skipDuplicates: true,
        });
      }

      await tx.caseCitation.deleteMany({
        where: { sourceCaseId: record.id },
      });

      if (cleanCitations.length) {
        const citedCases = await tx.caseRecord.findMany({
          where: {
            OR: [
              { canonicalCitation: { in: cleanCitations } },
              { slug: { in: cleanCitations } },
            ],
          },
          select: { id: true, canonicalCitation: true, slug: true },
        });

        if (citedCases.length) {
          const citedLookup = new Map<string, { id: string; canonicalCitation: string | null; slug: string }>();

          for (const cited of citedCases) {
            if (cited.canonicalCitation) {
              citedLookup.set(cited.canonicalCitation, cited);
            }
            citedLookup.set(cited.slug, cited);
          }

          await tx.caseCitation.createMany({
            data: cleanCitations
              .map((citationInput) => {
                const cited = citedLookup.get(citationInput);
                if (!cited) return null;

                return {
                  sourceCaseId: record.id,
                  citedCaseId: cited.id,
                  citationText: citationInput,
                };
              })
              .filter(Boolean) as Array<{
              sourceCaseId: string;
              citedCaseId: string;
              citationText: string;
            }>,
            skipDuplicates: true,
          });
        }
      }

      if (files.length) {
        await persistCaseSourceFiles(tx, {
          caseId: record.id,
          uploaderId: userId,
          files,
          writtenFilePaths,
        });
      }

      await tx.caseRevision.create({
        data: {
          caseId: record.id,
          version: nextRevisionVersion,
          editorId: userId,
          status: nextStatus,
          changeSummary:
            input.intent === 'submit'
              ? 'Case record updated and submitted for review.'
              : 'Case record updated from the case editor.',
          snapshot: {
            title: cleanTitle,
            canonicalCitation: cleanCitation,
            docketNumber: input.docketNumber?.trim() || null,
            summary: input.summary?.trim() || null,
            facts: input.facts?.trim() || null,
            issues: input.issues?.trim() || null,
            holding: input.holding?.trim() || null,
            outcome: input.outcome?.trim() || null,
            proceduralHistory: input.proceduralHistory?.trim() || null,
            categorySlug: input.categorySlug,
            tagSlugs: input.tagSlugs ?? [],
            regionSlug: input.regionSlug ?? null,
            courtSlug: input.courtSlug ?? null,
            sourceLinks: cleanLinks,
            citations: cleanCitations,
          },
        },
      });
    });
  } catch (error) {
    await cleanupUploadedFiles(writtenFilePaths);
    throw error;
  }

  return findCaseRecordBySlug(slug, userId);
}

export async function getCaseRepositoryMeta(viewerId?: string | null) {
  await ensureRepositoryMetaSeeded(viewerId);

  const [categoryRows, tagRows, regionRows, courtRows, organizationRows] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { slug: true, name: true },
    }),
    prisma.tag.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      take: 24,
      select: { slug: true, name: true },
    }),
    prisma.region.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: 20,
      select: { slug: true, name: true },
    }),
    prisma.court.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { slug: true, name: true, level: true, region: { select: { slug: true } } },
    }),
    viewerId
      ? prisma.organization.findMany({
          where: {
            OR: [{ ownerId: viewerId }, { members: { some: { userId: viewerId, status: 'ACTIVE' } } }],
          },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    categories: categoryRows.map((item) => ({ id: item.slug, name: item.name })),
    tags: tagRows.map((item) => ({ id: item.slug, name: item.name })),
    regions: regionRows.map((item) => ({ id: item.slug, name: item.name })),
    courts: courtRows.map((item) => ({
      id: item.slug,
      name: item.name,
      level: item.level,
      regionId: item.region?.slug ?? null,
    })),
    organizations: organizationRows,
  };
}

export async function createCaseDraft(authorId: string, input: CreateCaseDraftInput, files: File[] = []) {
  const category = await prisma.category.findUnique({
    where: { slug: input.categorySlug },
    select: { id: true, name: true },
  });

  if (!category) {
    throw new Error('Selected category was not found.');
  }

  const [region, court, organization, tagRows] = await Promise.all([
    input.regionSlug
      ? prisma.region.findUnique({ where: { slug: input.regionSlug }, select: { id: true, slug: true, name: true } })
      : Promise.resolve(null),
    input.courtSlug
      ? prisma.court.findUnique({ where: { slug: input.courtSlug }, select: { id: true, slug: true, name: true } })
      : Promise.resolve(null),
    input.organizationId
      ? prisma.organization.findUnique({ where: { id: input.organizationId }, select: { id: true } })
      : Promise.resolve(null),
    input.tagSlugs?.length
      ? prisma.tag.findMany({ where: { slug: { in: input.tagSlugs } }, select: { id: true, slug: true } })
      : Promise.resolve([]),
  ]);

  const cleanLinks = (input.sourceLinks ?? [])
    .map((item) => ({
      label: item.label?.trim() || null,
      sourceName: item.sourceName?.trim() || null,
      url: item.url.trim(),
    }))
    .filter((item) => item.url.length > 0);

  const cleanCitation = input.canonicalCitation?.trim() || null;
  const cleanTitle = input.title.trim();

  if (!cleanTitle) {
    throw new Error('Case title is required.');
  }

  if (cleanCitation) {
    const existingCitation = await prisma.caseRecord.findUnique({
      where: { canonicalCitation: cleanCitation },
      select: { slug: true, title: true },
    });

    if (existingCitation) {
      throw new Error(
        `Canonical citation "${cleanCitation}" already exists on "${existingCitation.title}". Change the citation or open the existing case.`,
      );
    }
  }

  const slug = await uniqueSlug(cleanTitle);
  const status: RepositoryItemStatus = input.intent === 'submit' ? 'PENDING_REVIEW' : 'DRAFT';
  const versionStatus: RepositoryItemStatus = status;

  
  const writtenFilePaths: string[] = [];

  try {
    const created = await prisma.$transaction(async (tx) => {
      const caseRecord = await tx.caseRecord.create({
      data: {
        slug,
        title: cleanTitle,
        canonicalCitation: cleanCitation,
        docketNumber: input.docketNumber?.trim() || null,
        summary: input.summary?.trim() || null,
        facts: input.facts?.trim() || null,
        issues: input.issues?.trim() || null,
        holding: input.holding?.trim() || null,
        outcome: input.outcome?.trim() || null,
        proceduralHistory: input.proceduralHistory?.trim() || null,
        sourceType: input.sourceType ?? 'USER_SUBMITTED',
        visibility: input.visibility ?? 'PUBLIC',
        status,
        authorId,
        organizationId: organization?.id ?? null,
        primaryCategoryId: category.id,
        regionId: region?.id ?? null,
        courtId: court?.id ?? null,
        sourceCount: cleanLinks.length + files.length,
        revisionCount: 1,
        sourceLinks: cleanLinks.length
          ? {
              create: cleanLinks.map((item, index) => ({
                label: item.label,
                sourceName: item.sourceName,
                url: item.url,
                isPrimary: index === 0,
              })),
            }
          : undefined,
        tags: tagRows.length
          ? {
              create: tagRows.map((tag) => ({
                tagId: tag.id,
              })),
            }
          : undefined,
        revisions: {
          create: {
            version: 1,
            editorId: authorId,
            status: versionStatus,
            changeSummary: input.intent === 'submit' ? 'Initial case draft submitted for review.' : 'Initial case draft created.',
            snapshot: {
              title: cleanTitle,
              canonicalCitation: cleanCitation,
              summary: input.summary?.trim() || null,
              facts: input.facts?.trim() || null,
              issues: input.issues?.trim() || null,
              holding: input.holding?.trim() || null,
              outcome: input.outcome?.trim() || null,
              proceduralHistory: input.proceduralHistory?.trim() || null,
              categorySlug: input.categorySlug,
              tagSlugs: input.tagSlugs ?? [],
              regionSlug: input.regionSlug ?? null,
              courtSlug: input.courtSlug ?? null,
              sourceLinks: cleanLinks,
              citations: input.citations ?? [],
            },
          },
        },
      },
      
      select: { id: true, slug: true },
    });

      const cleanCitations = Array.from(new Set((input.citations ?? []).map((item) => item.trim()).filter(Boolean)));

      if (cleanCitations.length) {
        const citedCases = await tx.caseRecord.findMany({
          where: {
            OR: [
              { canonicalCitation: { in: cleanCitations } },
              { slug: { in: cleanCitations } },
            ],
          },
          select: { id: true, canonicalCitation: true, slug: true },
        });

        if (citedCases.length) {
          const citedLookup = new Map<string, { id: string; canonicalCitation: string | null; slug: string }>();

          for (const cited of citedCases) {
            if (cited.canonicalCitation) {
              citedLookup.set(cited.canonicalCitation, cited);
            }
            citedLookup.set(cited.slug, cited);
          }

          await tx.caseCitation.createMany({
            data: cleanCitations
              .map((citationInput) => {
                const cited = citedLookup.get(citationInput);
                if (!cited) return null;

                return {
                  sourceCaseId: caseRecord.id,
                  citedCaseId: cited.id,
                  citationText: citationInput,
                };
              })
              .filter(Boolean) as Array<{
              sourceCaseId: string;
              citedCaseId: string;
              citationText: string;
            }>,
            skipDuplicates: true,
          });
        }
      }

      if (files.length) {
        await persistCaseSourceFiles(tx, {
          caseId: caseRecord.id,
          uploaderId: authorId,
          files,
          writtenFilePaths,
        });
      }

      await tx.userStats.upsert({
      where: { userId: authorId },
      update: {
        caseCount: { increment: 1 },
        lastContributionAt: new Date(),
      },
      create: {
        userId: authorId,
        caseCount: 1,
        lastContributionAt: new Date(),
      },
    });

      await tx.gamificationEvent.create({
      data: {
        userId: authorId,
        eventType: 'CASE_SUBMITTED',
        pointsDelta: CASE_SUBMISSION_POINTS,
        caseId: caseRecord.id,
      },
    });

      await tx.userGamification.upsert({
      where: { userId: authorId },
      update: {
        totalPoints: { increment: CASE_SUBMISSION_POINTS },
        lastContributionAt: new Date(),
      },
      create: {
        userId: authorId,
        totalPoints: CASE_SUBMISSION_POINTS,
        lastContributionAt: new Date(),
      },
    });

      await upsertUserActivityDaily(tx, authorId, {
      caseCount: 1,
      engagementScore: CASE_SUBMISSION_POINTS,
      });

      return caseRecord;
    });

    return findCaseRecordBySlug(created.slug, authorId);
  } catch (error) {
    await cleanupUploadedFiles(writtenFilePaths);
    throw error;
  }
}
