import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Organizations table
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  weekStart: text("week_start").notNull().default("Mon").$type<"Mon" | "Sun">(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Users table
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull().default("member").$type<"member" | "manager" | "owner">(),
    costRateCents: integer("cost_rate_cents").default(0),
    billRateCents: integer("bill_rate_cents").default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    orgIdIdx: uniqueIndex("users_org_id_idx").on(table.orgId, table.id),
  })
);

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  clientId: integer("client_id").references(() => clients.id),
  name: text("name").notNull(),
  status: text("status").notNull().default("active").$type<"active" | "archived">(),
  budgetType: text("budget_type").$type<"hours" | "amount">(),
  budgetValue: integer("budget_value"),
  defaultBillRateCents: integer("default_bill_rate_cents"),
  isRetainer: boolean("is_retainer").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Time entries table
export const timeEntries = pgTable(
  "time_entries",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id),
    userId: integer("user_id").notNull().references(() => users.id),
    projectId: integer("project_id").notNull().references(() => projects.id),
    taskId: integer("task_id").references(() => tasks.id),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at"),
    minutes: integer("minutes"),
    note: text("note"),
    billable: boolean("billable").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdOrgIdIdx: uniqueIndex("time_entries_user_id_org_id_idx").on(table.userId, table.orgId),
  })
);

// Allocations table (for resource planning)
export const allocations = pgTable(
  "allocations",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id),
    userId: integer("user_id").notNull().references(() => users.id),
    projectId: integer("project_id").notNull().references(() => projects.id),
    weekStartDate: date("week_start_date").notNull(),
    plannedHours: numeric("planned_hours", { precision: 5, scale: 1 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    weekUserIdx: uniqueIndex("allocations_week_user_idx").on(table.weekStartDate, table.userId),
  })
);

// Project role rate overrides table
export const projectRoleRateOverrides = pgTable("project_role_rate_overrides", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  roleName: text("role_name").notNull(),
  billRateCents: integer("bill_rate_cents").notNull(),
});

// Project user rate overrides table
export const projectUserRateOverrides = pgTable("project_user_rate_overrides", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
  billRateCents: integer("bill_rate_cents").notNull(),
});

// Role default rates table (organization-level default rates by role)
export const roleDefaultRates = pgTable("role_default_rates", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  roleName: text("role_name").notNull().$type<"member" | "manager" | "owner">(),
  costRateCents: integer("cost_rate_cents").default(0),
  billRateCents: integer("bill_rate_cents").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgRoleIdx: uniqueIndex("role_default_rates_org_role_idx").on(table.orgId, table.roleName),
}));

// Calendar tokens table (for Google Calendar integration)
export const calendarTokens = pgTable("calendar_tokens", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  provider: text("provider").notNull().default("google"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiry: timestamp("expiry"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Events cache table (for Google Calendar events)
export const eventsCache = pgTable("events_cache", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  providerEventId: text("provider_event_id").notNull(),
  calendarId: text("calendar_id").notNull(),
  startTs: timestamp("start_ts").notNull(),
  endTs: timestamp("end_ts").notNull(),
  title: text("title"),
  attendees: jsonb("attendees"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// NextAuth tables for authentication
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  sessionToken: text("session_token").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires").notNull(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  clients: many(clients),
  projects: many(projects),
  tasks: many(tasks),
  timeEntries: many(timeEntries),
  allocations: many(allocations),
  roleDefaultRates: many(roleDefaultRates),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
  timeEntries: many(timeEntries),
  allocations: many(allocations),
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clients.orgId],
    references: [organizations.id],
  }),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  tasks: many(tasks),
  timeEntries: many(timeEntries),
  allocations: many(allocations),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tasks.orgId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  timeEntries: many(timeEntries),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  organization: one(organizations, {
    fields: [timeEntries.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
  task: one(tasks, {
    fields: [timeEntries.taskId],
    references: [tasks.id],
  }),
}));

export const allocationsRelations = relations(allocations, ({ one }) => ({
  organization: one(organizations, {
    fields: [allocations.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [allocations.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [allocations.projectId],
    references: [projects.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// Invitations table for user onboarding
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  email: text("email").notNull(),
  role: text("role").notNull().default("member").$type<"member" | "manager" | "owner">(),
  invitedBy: integer("invited_by").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  emailOrgIdx: uniqueIndex("invitations_email_org_idx").on(table.email, table.orgId),
  tokenIdx: uniqueIndex("invitations_token_idx").on(table.token),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, { fields: [invitations.orgId], references: [organizations.id] }),
  invitedByUser: one(users, { fields: [invitations.invitedBy], references: [users.id] }),
}));

export const roleDefaultRatesRelations = relations(roleDefaultRates, ({ one }) => ({
  organization: one(organizations, { fields: [roleDefaultRates.orgId], references: [organizations.id] }),
}));

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Allocation = typeof allocations.$inferSelect;
export type NewAllocation = typeof allocations.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type RoleDefaultRate = typeof roleDefaultRates.$inferSelect;
export type NewRoleDefaultRate = typeof roleDefaultRates.$inferInsert;