import { relations } from "drizzle-orm/relations";
import { 
  // Enhanced core tables
  projects,
  users,
  
  // New schema-driven tables
  formSchemas,
  formFields,
  schemaActivityCategories,
  dynamicActivities,
  configurableEventMappings,
  statementTemplates,
  financialReports,
  schemaFormDataEntries,
  systemConfigurations,
  configurationAuditLog,
  
  // Existing tables (referenced)
  facilities,
  reportingPeriods,
  events,
  districts,
  provinces,
  account,
  session,
  verification
} from "../schema";

// === ENHANCED CORE RELATIONS ===

export const projectsRelations = relations(projects, ({ one, many }) => ({
  // Original relations
  facility: one(facilities, {
    fields: [projects.facilityId],
    references: [facilities.id]
  }),
  reportingPeriod: one(reportingPeriods, {
    fields: [projects.reportingPeriodId],
    references: [reportingPeriods.id]
  }),
  user: one(users, {
    fields: [projects.userId],
    references: [users.id]
  }),
  // New schema-driven relations
  formSchemas: many(formSchemas),
  financialReports: many(financialReports),
  formDataEntries: many(schemaFormDataEntries),
  eventMappings: many(configurableEventMappings),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [users.facilityId],
    references: [facilities.id]
  }),
  accounts: many(account),
  sessions: many(session),
  projects: many(projects),
  createdFormSchemas: many(formSchemas, { relationName: "form_schema_creator" }),
  createdReports: many(financialReports, { relationName: "report_creator" }),
  updatedReports: many(financialReports, { relationName: "report_updater" }),
  submittedReports: many(financialReports, { relationName: "report_submitter" }),
  approvedReports: many(financialReports, { relationName: "report_approver" }),
  formDataEntries: many(schemaFormDataEntries, { relationName: "form_data_creator" }),
  auditLogs: many(configurationAuditLog),
}));

// === SCHEMA-DRIVEN RELATIONS ===

export const formSchemasRelations = relations(formSchemas, ({ one, many }) => ({
  creator: one(users, {
    fields: [formSchemas.createdBy],
    references: [users.id],
    relationName: "form_schema_creator"
  }),
  formFields: many(formFields),
  formDataEntries: many(schemaFormDataEntries),
}));

export const formFieldsRelations = relations(formFields, ({ one, many }) => ({
  schema: one(formSchemas, {
    fields: [formFields.schemaId],
    references: [formSchemas.id]
  }),
  parentField: one(formFields, {
    fields: [formFields.parentFieldId],
    references: [formFields.id],
    relationName: "field_hierarchy"
  }),
  childFields: many(formFields, {
    relationName: "field_hierarchy"
  }),
  category: one(schemaActivityCategories, {
    fields: [formFields.categoryId],
    references: [schemaActivityCategories.id]
  }),
}));

export const schemaActivityCategoriesRelations = relations(schemaActivityCategories, ({ one, many }) => ({
  parentCategory: one(schemaActivityCategories, {
    fields: [schemaActivityCategories.parentCategoryId],
    references: [schemaActivityCategories.id],
    relationName: "category_hierarchy"
  }),
  subCategories: many(schemaActivityCategories, {
    relationName: "category_hierarchy"
  }),
  activities: many(dynamicActivities),
  formFields: many(formFields),
  eventMappings: many(configurableEventMappings),
}));

export const dynamicActivitiesRelations = relations(dynamicActivities, ({ one, many }) => ({
  category: one(schemaActivityCategories, {
    fields: [dynamicActivities.categoryId],
    references: [schemaActivityCategories.id]
  }),
  eventMappings: many(configurableEventMappings),
}));

export const configurableEventMappingsRelations = relations(configurableEventMappings, ({ one }) => ({
  event: one(events, {
    fields: [configurableEventMappings.eventId],
    references: [events.id]
  }),
  activity: one(dynamicActivities, {
    fields: [configurableEventMappings.activityId],
    references: [dynamicActivities.id]
  }),
  category: one(schemaActivityCategories, {
    fields: [configurableEventMappings.categoryId],
    references: [schemaActivityCategories.id]
  }),
}));

export const statementTemplatesRelations = relations(statementTemplates, ({ one, many }) => ({
  parentLine: one(statementTemplates, {
    fields: [statementTemplates.parentLineId],
    references: [statementTemplates.id],
    relationName: "statement_hierarchy"
  }),
  childLines: many(statementTemplates, {
    relationName: "statement_hierarchy"
  }),
}));

export const financialReportsRelations = relations(financialReports, ({ one }) => ({
  project: one(projects, {
    fields: [financialReports.projectId],
    references: [projects.id]
  }),
  facility: one(facilities, {
    fields: [financialReports.facilityId],
    references: [facilities.id]
  }),
  reportingPeriod: one(reportingPeriods, {
    fields: [financialReports.reportingPeriodId],
    references: [reportingPeriods.id]
  }),
  creator: one(users, {
    fields: [financialReports.createdBy],
    references: [users.id],
    relationName: "report_creator"
  }),
  updater: one(users, {
    fields: [financialReports.updatedBy],
    references: [users.id],
    relationName: "report_updater"
  }),
  submitter: one(users, {
    fields: [financialReports.submittedBy],
    references: [users.id],
    relationName: "report_submitter"
  }),
  approver: one(users, {
    fields: [financialReports.approvedBy],
    references: [users.id],
    relationName: "report_approver"
  }),
}));

export const schemaFormDataEntriesRelations = relations(schemaFormDataEntries, ({ one }) => ({
  schema: one(formSchemas, {
    fields: [schemaFormDataEntries.schemaId],
    references: [formSchemas.id]
  }),
  project: one(projects, {
    fields: [schemaFormDataEntries.projectId],
    references: [projects.id]
  }),
  facility: one(facilities, {
    fields: [schemaFormDataEntries.facilityId],
    references: [facilities.id]
  }),
  reportingPeriod: one(reportingPeriods, {
    fields: [schemaFormDataEntries.reportingPeriodId],
    references: [reportingPeriods.id]
  }),
  creator: one(users, {
    fields: [schemaFormDataEntries.createdBy],
    references: [users.id],
    relationName: "form_data_creator"
  }),
  updater: one(users, {
    fields: [schemaFormDataEntries.updatedBy],
    references: [users.id]
  }),
}));

export const systemConfigurationsRelations = relations(systemConfigurations, ({ one }) => ({
  scopeProject: one(projects, {
    fields: [systemConfigurations.scopeId],
    references: [projects.id]
  }),
  scopeFacility: one(facilities, {
    fields: [systemConfigurations.scopeId],
    references: [facilities.id]
  }),
}));

export const configurationAuditLogRelations = relations(configurationAuditLog, ({ one }) => ({
  changedByUser: one(users, {
    fields: [configurationAuditLog.changedBy],
    references: [users.id]
  }),
}));

// === EXISTING TABLE RELATIONS (Updated) ===

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  district: one(districts, {
    fields: [facilities.districtId],
    references: [districts.id]
  }),
  // Updated to use new schema-driven tables
  formDataEntries: many(schemaFormDataEntries),
  projects: many(projects),
  users: many(users),
  financialReports: many(financialReports),
}));

export const reportingPeriodsRelations = relations(reportingPeriods, ({ many }) => ({
  // Updated to use new schema-driven tables
  formDataEntries: many(schemaFormDataEntries),
  projects: many(projects),
  financialReports: many(financialReports),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  // Updated to use configurable event mappings
  eventMappings: many(configurableEventMappings),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  province: one(provinces, {
    fields: [districts.provinceId],
    references: [provinces.id]
  }),
  facilities: many(facilities),
}));

export const provincesRelations = relations(provinces, ({ many }) => ({
  districts: many(districts),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(users, {
    fields: [account.userId],
    references: [users.id]
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(users, {
    fields: [session.userId],
    references: [users.id]
  }),
}));