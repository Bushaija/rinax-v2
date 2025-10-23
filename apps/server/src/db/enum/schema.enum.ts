import { pgEnum } from "drizzle-orm/pg-core";

export const facilityType = pgEnum("facility_type", [
    "hospital", 
    "health_center"
]);

export const projectType = pgEnum("project_type", [
    "HIV", 
    "Malaria", 
    "TB"
]);

export const userRole = pgEnum("user_role", [
    "accountant", 
    "admin", 
    "superadmin",
    "program_manager"
]);

export const formFieldType = pgEnum("form_field_type", [
    "text",
    "number",
    "currency",
    "percentage",
    "date",
    "select",
    "multiselect",
    "checkbox",
    "textarea",
    "calculated",
    "readonly"
]);

export const validationType = pgEnum("validation_type", [
    "required",
    "min",
    "max",
    "minLength",
    "maxLength",
    "pattern",
    "custom"
]);

export const mappingType = pgEnum("mapping_type", [
    "DIRECT",
    "COMPUTED",
    "AGGREGATED"
]);

export const reportStatus = pgEnum("report_status", [
    "draft",
    "submitted",
    "approved",
    "rejected"
]);

export const moduleType = pgEnum("module_type", [
    "planning",
    "execution",
    "reporting"
]);

export const balanceType = pgEnum("balance_type", [
    "DEBIT",
    "CREDIT",
    "BOTH"
]);

export const eventType = pgEnum("event_type", [
    "REVENUE",
    "EXPENSE",
    "ASSET",
    "LIABILITY",
    "EQUITY"
]);

export const approvalStatus = pgEnum("approval_status", [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "DRAFT"
]);

