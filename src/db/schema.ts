import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  real,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "verified_finder",
  "recovery_point",
  "moderator",
  "admin",
  "authority",
]);

export const itemStatusEnum = pgEnum("item_status", [
  "active",
  "matched",
  "in_recovery",
  "recovered",
  "expired",
  "withdrawn",
  "suspended",
]);

/**
 * Categories flagged `requiresModeration` (see category-fields.ts — currently
 * only missing persons) are NOT publicly visible or matched until a human
 * moderator reviews them. A false or malicious "missing child" report
 * carries real-world harm (custody abduction, exposing a child's photo,
 * harassment) that a purely automated pipeline cannot screen out — unlike
 * lost wallets, this one category can't stay auto-published.
 */
export const moderationStatusEnum = pgEnum("moderation_status", [
  "auto_approved",
  "pending_review",
  "approved",
  "rejected",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "pending",
  "notified",
  "verifying",
  "verified",
  "rejected",
  "expired",
  "completed",
]);

export const matchLevelEnum = pgEnum("match_level", [
  "weak",
  "possible",
  "probable",
  "very_probable",
]);

export const recoveryStatusEnum = pgEnum("recovery_status", [
  "proposed",
  "accepted",
  "at_point",
  "in_transit",
  "completed",
  "cancelled",
  "disputed",
]);

export const recoveryMethodEnum = pgEnum("recovery_method", [
  "direct_meetup",
  "recovery_point",
  "delivery",
  "authority",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
]);

export const reportTargetTypeEnum = pgEnum("report_target_type", [
  "user",
  "lost_item",
  "found_item",
  "message",
  "match",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "passed",
  "failed",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "match_found",
  "verification_request",
  "verification_result",
  "message",
  "recovery_update",
  "system",
  "reputation",
]);

export const reputationLevelEnum = pgEnum("reputation_level", [
  "new",
  "reliable",
  "verified_finder",
  "super_finder",
  "partner",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    phone: text("phone").notNull().unique(),
    email: text("email").unique(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    role: userRoleEnum("role").default("user").notNull(),
    country: text("country").default("IT").notNull(),
    city: text("city"),
    avatarUrl: text("avatar_url"),
    reputationScore: integer("reputation_score").default(0).notNull(),
    reputationLevel: reputationLevelEnum("reputation_level")
      .default("new")
      .notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    isBlocked: boolean("is_blocked").default(false).notNull(),
    blockReason: text("block_reason"),
    failedVerifyAttempts: integer("failed_verify_attempts").default(0).notNull(),
    failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
    loginLockedUntil: timestamp("login_locked_until"),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("users_phone_idx").on(t.phone),
    index("users_city_idx").on(t.city),
    index("users_role_idx").on(t.role),
  ]
);

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  nameFr: text("name_fr").notNull(),
  nameEn: text("name_en").notNull(),
  icon: text("icon").notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => categories.id),
  isSensitive: boolean("is_sensitive").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lostItems = pgTable(
  "lost_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    subcategoryId: uuid("subcategory_id").references(() => categories.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    brand: text("brand"),
    model: text("model"),
    color: text("color"),
    distinctiveFeatures: text("distinctive_features"),
    serialPartial: text("serial_partial"),
    // Auto-derived from idFullEncrypted at write time (see maskIdNumber in
    // lib/security.ts) — never typed by the user directly anymore, which
    // used to be error-prone and inconsistent. Safe to show publicly.
    idPartialMasked: text("id_partial_masked"),
    // The real, complete document/ID number, AES-256-GCM encrypted (see
    // encryptPrivatePayload) — never stored or returned in plaintext
    // anywhere. Decrypted only ephemerally, server-side, by the matching
    // engine to compare two declarations' numbers for an exact-match
    // signal far stronger than comparing two masked strings. No UI or API
    // response ever surfaces this column's value, encrypted or not.
    idFullEncrypted: text("id_full_encrypted"),
    // Category-specific structured attributes (age/height for a missing
    // person, breed/chip number for an animal, etc.) — see
    // src/lib/category-fields.ts. Keys are allowlisted server-side per
    // category so this stays structured, not an arbitrary free-for-all.
    details: jsonb("details").$type<Record<string, string>>(),
    keywords: text("keywords").array(),
    lostDate: timestamp("lost_date"),
    lostTimeApprox: text("lost_time_approx"),
    city: text("city").notNull(),
    district: text("district"),
    locationApprox: text("location_approx"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    photoUrls: text("photo_urls").array(),
    blurredPhotoUrls: text("blurred_photo_urls").array(),
    rewardAmount: integer("reward_amount"),
    rewardCurrency: text("reward_currency").default("XOF"),
    status: itemStatusEnum("status").default("active").notNull(),
    isSensitive: boolean("is_sensitive").default(false).notNull(),
    privateNotes: text("private_notes"),
    verificationHints: jsonb("verification_hints").$type<string[]>(),
    moderationStatus: moderationStatusEnum("moderation_status")
      .default("auto_approved")
      .notNull(),
    moderationNotes: text("moderation_notes"),
    moderatedBy: uuid("moderated_by").references(() => users.id),
    moderatedAt: timestamp("moderated_at"),
    expiresAt: timestamp("expires_at"),
    country: text("country").default("IT").notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("lost_items_user_idx").on(t.userId),
    index("lost_items_category_idx").on(t.categoryId),
    index("lost_items_status_idx").on(t.status),
    index("lost_items_city_idx").on(t.city),
    index("lost_items_created_idx").on(t.createdAt),
    index("lost_items_moderation_idx").on(t.moderationStatus),
  ]
);

export const foundItems = pgTable(
  "found_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    subcategoryId: uuid("subcategory_id").references(() => categories.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    brand: text("brand"),
    model: text("model"),
    color: text("color"),
    distinctiveFeatures: text("distinctive_features"),
    serialPartial: text("serial_partial"),
    idPartialMasked: text("id_partial_masked"),
    idFullEncrypted: text("id_full_encrypted"),
    details: jsonb("details").$type<Record<string, string>>(),
    keywords: text("keywords").array(),
    foundDate: timestamp("found_date"),
    foundTimeApprox: text("found_time_approx"),
    city: text("city").notNull(),
    district: text("district"),
    locationApprox: text("location_approx"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    photoUrls: text("photo_urls").array(),
    blurredPhotoUrls: text("blurred_photo_urls").array(),
    condition: text("condition"),
    status: itemStatusEnum("status").default("active").notNull(),
    isSensitive: boolean("is_sensitive").default(false).notNull(),
    privateDataEncrypted: text("private_data_encrypted"),
    recoveryPointId: uuid("recovery_point_id").references(
      () => recoveryPoints.id
    ),
    moderationStatus: moderationStatusEnum("moderation_status")
      .default("auto_approved")
      .notNull(),
    moderationNotes: text("moderation_notes"),
    moderatedBy: uuid("moderated_by").references(() => users.id),
    moderatedAt: timestamp("moderated_at"),
    country: text("country").default("IT").notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("found_items_user_idx").on(t.userId),
    index("found_items_category_idx").on(t.categoryId),
    index("found_items_status_idx").on(t.status),
    index("found_items_city_idx").on(t.city),
    index("found_items_created_idx").on(t.createdAt),
    index("found_items_moderation_idx").on(t.moderationStatus),
  ]
);

/**
 * Private originals of user-uploaded photos, re-encoded and stripped of
 * metadata at upload time. Never served publicly — only the redacted
 * derivative written by processSensitivePhotos() (under a fresh random
 * filename in the public uploads dir) is ever exposed. `usedAt` prevents an
 * upload id from being replayed onto more than one declaration.
 */
export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    privateFilename: text("private_filename").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("uploads_user_idx").on(t.userId),
  ]
);

export const declarationTypeEnum = pgEnum("declaration_type", ["lost", "found"]);

/**
 * Snapshot of an expired lost/found declaration, written by
 * archiveExpiredDeclarations() before the live row is deleted — data
 * minimization (retention limited past expiry) without silently destroying
 * the record. `data` holds the full original row as JSON.
 */
export const archivedDeclarations = pgTable(
  "archived_declarations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    originalId: uuid("original_id").notNull(),
    type: declarationTypeEnum("type").notNull(),
    userId: uuid("user_id").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    expiredAt: timestamp("expired_at").notNull(),
    archivedAt: timestamp("archived_at").defaultNow().notNull(),
  },
  (t) => [
    index("archived_declarations_original_idx").on(t.originalId),
    index("archived_declarations_user_idx").on(t.userId),
    index("archived_declarations_type_idx").on(t.type),
  ]
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lostItemId: uuid("lost_item_id")
      .notNull()
      .references(() => lostItems.id, { onDelete: "cascade" }),
    foundItemId: uuid("found_item_id")
      .notNull()
      .references(() => foundItems.id, { onDelete: "cascade" }),
    score: real("score").notNull(),
    level: matchLevelEnum("level").notNull(),
    scoreBreakdown: jsonb("score_breakdown").$type<Record<string, number>>(),
    status: matchStatusEnum("status").default("pending").notNull(),
    lostOwnerNotified: boolean("lost_owner_notified").default(false).notNull(),
    finderNotified: boolean("finder_notified").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("matches_pair_idx").on(t.lostItemId, t.foundItemId),
    index("matches_score_idx").on(t.score),
    index("matches_status_idx").on(t.status),
  ]
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    claimantId: uuid("claimant_id")
      .notNull()
      .references(() => users.id),
    questions: jsonb("questions")
      .$type<
        {
          id: string;
          question: string;
          type: string;
          expectedHint?: string;
        }[]
      >()
      .notNull(),
    answers: jsonb("answers").$type<Record<string, string>>(),
    score: real("score"),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    attemptsUsed: integer("attempts_used").default(0).notNull(),
    status: verificationStatusEnum("status").default("pending").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("verifications_match_idx").on(t.matchId),
    index("verifications_claimant_idx").on(t.claimantId),
  ]
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    participant1Id: uuid("participant1_id")
      .notNull()
      .references(() => users.id),
    participant2Id: uuid("participant2_id")
      .notNull()
      .references(() => users.id),
    isActive: boolean("is_active").default(true).notNull(),
    phoneShared: boolean("phone_shared").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("conversations_match_idx").on(t.matchId)]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("messages_conversation_idx").on(t.conversationId),
    index("messages_created_idx").on(t.createdAt),
  ]
);

export const recoveryPoints = pgTable(
  "recovery_points",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    country: text("country").default("IT").notNull(),
    latitude: real("latitude"),
    longitude: real("longitude"),
    phone: text("phone"),
    email: text("email"),
    hours: text("hours"),
    managerName: text("manager_name"),
    managerUserId: uuid("manager_user_id").references(() => users.id),
    isActive: boolean("is_active").default(true).notNull(),
    itemsDeposited: integer("items_deposited").default(0).notNull(),
    itemsRecovered: integer("items_recovered").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("recovery_points_city_idx").on(t.city),
    index("recovery_points_active_idx").on(t.isActive),
  ]
);

export const recoveries = pgTable(
  "recoveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    method: recoveryMethodEnum("method").notNull(),
    status: recoveryStatusEnum("status").default("proposed").notNull(),
    recoveryPointId: uuid("recovery_point_id").references(
      () => recoveryPoints.id
    ),
    meetupLocation: text("meetup_location"),
    meetupDate: timestamp("meetup_date"),
    notes: text("notes"),
    ownerConfirmed: boolean("owner_confirmed").default(false).notNull(),
    finderConfirmed: boolean("finder_confirmed").default(false).notNull(),
    restitutionCode: text("restitution_code"),
    restitutionCodeVerifiedAt: timestamp("restitution_code_verified_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("recoveries_match_idx").on(t.matchId),
    index("recoveries_status_idx").on(t.status),
  ]
);

export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recoveryId: uuid("recovery_id")
      .notNull()
      .references(() => recoveries.id, { onDelete: "cascade" }),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id),
    score: integer("score").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("ratings_unique_idx").on(t.recoveryId, t.fromUserId),
    index("ratings_to_user_idx").on(t.toUserId),
  ]
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id),
    targetType: reportTargetTypeEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    status: reportStatusEnum("status").default("open").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    resolution: text("resolution"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("reports_status_idx").on(t.status),
    index("reports_target_idx").on(t.targetType, t.targetId),
  ]
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    isRead: boolean("is_read").default(false).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_read_idx").on(t.isRead),
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("audit_logs_user_idx").on(t.userId),
    index("audit_logs_action_idx").on(t.action),
    index("audit_logs_created_idx").on(t.createdAt),
  ]
);

export const fraudFlags = pgTable(
  "fraud_flags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    flagType: text("flag_type").notNull(),
    severity: integer("severity").default(1).notNull(),
    details: text("details"),
    isResolved: boolean("is_resolved").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("fraud_flags_user_idx").on(t.userId),
    index("fraud_flags_resolved_idx").on(t.isResolved),
  ]
);

/**
 * Directional per-relationship block ("bloquer ce contact" in chat) — does
 * not suspend the blocked user's account (unlike `users.isBlocked`), it only
 * closes messaging between these two specific users.
 */
export const userBlocks = pgTable(
  "user_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("user_blocks_pair_idx").on(t.blockerId, t.blockedId),
    index("user_blocks_blocked_idx").on(t.blockedId),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("sessions_token_idx").on(t.token),
    index("sessions_user_idx").on(t.userId),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  lostItems: many(lostItems),
  foundItems: many(foundItems),
  notifications: many(notifications),
}));

export const lostItemsRelations = relations(lostItems, ({ one, many }) => ({
  user: one(users, { fields: [lostItems.userId], references: [users.id] }),
  category: one(categories, {
    fields: [lostItems.categoryId],
    references: [categories.id],
  }),
  matches: many(matches),
}));

export const foundItemsRelations = relations(foundItems, ({ one, many }) => ({
  user: one(users, { fields: [foundItems.userId], references: [users.id] }),
  category: one(categories, {
    fields: [foundItems.categoryId],
    references: [categories.id],
  }),
  matches: many(matches),
  recoveryPoint: one(recoveryPoints, {
    fields: [foundItems.recoveryPointId],
    references: [recoveryPoints.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  lostItem: one(lostItems, {
    fields: [matches.lostItemId],
    references: [lostItems.id],
  }),
  foundItem: one(foundItems, {
    fields: [matches.foundItemId],
    references: [foundItems.id],
  }),
  verifications: many(verifications),
  conversations: many(conversations),
  recoveries: many(recoveries),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type LostItem = typeof lostItems.$inferSelect;
export type FoundItem = typeof foundItems.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type RecoveryPoint = typeof recoveryPoints.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Recovery = typeof recoveries.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
