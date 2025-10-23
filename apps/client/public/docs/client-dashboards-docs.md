## **Budget Monitoring System - Dashboard Design Specification**
### **Primary Users Analysis**
Based on the schema and API design, the system serves three primary user roles:

- **Accountants**: Data entry, budget planning, execution tracking
- **Program Managers**: Budget oversight, report review, project management
- **Admins**: System configuration, user management, schema administration


### **User Workflows**

#### **Accountant Journey**

1. **Login** → Dashboard with facility-specific projects and pending tasks
2. **Planning Phase** → Create/edit annual budget plans using dynamic forms
3. **Execution Phase** → Record quarterly actual expenditures and receipts
4. **Data Review** → View computed balances, validation errors, submit reports
5. **Statement Review** → Preview generated financial statements before submission

#### **Program Manager Journey**

1. **Login** → Executive dashboard with multi-project overview
2. **Budget Oversight** → Review planned vs actual across all projects
3. **Report Approval** → Review submitted reports, approve/reject with comments
4. **Performance Analysis** → Analyze spending patterns, variance reports
5. **Stakeholder Reporting** → Generate donor/government reports

#### **Admin Journey**

1. **Login** → System administration dashboard
2. **Schema Management** → Configure forms, categories, activities for different project types
3. **User Management** → Manage accountant and manager access
4. **System Configuration** → Set up event mappings, validation rules
5. **Data Migration** → Import/export data, manage system updates


### **Core Features & Pages**

Accountant Pages

| Page            | Purpose                              | API Endpoints                           | DB Tables                                                                 | Components                                      |
|-----------------|--------------------------------------|-----------------------------------------|---------------------------------------------------------------------------|-------------------------------------------------|
| Dashboard       | Overview of assigned projects and tasks | GET /dashboard/accountant               | enhanced_projects, schema_form_data_entries                              | KPI cards, task list, recent activities         |
| Planning Form   | Annual budget data entry             | GET/POST /planning, GET /schemas/:id    | schema_form_data_entries, form_schemas, dynamic_activities                | Dynamic form builder, calculation widgets, validation alerts |
| Execution Form  | Quarterly actual data entry          | GET/POST /execution, GET /schemas/:id   | schema_form_data_entries, form_schemas                                   | Quarterly input grid, balance calculator, running totals |
| Report Preview  | Review generated statements          | GET /financial-reports/:id, GET /statements/:id | enhanced_financial_reports, enhanced_statement_templates          | Statement viewer, PDF preview, submission workflow |
| Data History    | View previous submissions            | GET /planning/history, GET /execution/history | schema_form_data_entries, configuration_audit_log                | Timeline view, comparison tables, version history |

---

### **Admin Pages**

| Page               | Purpose                              | API Endpoints                           | DB Tables                                                                 | Components                                      |
|--------------------|--------------------------------------|-----------------------------------------|---------------------------------------------------------------------------|-------------------------------------------------|
| System Dashboard   | Admin overview                       | GET /dashboard/admin, GET /configurations/system-health | system_configurations, configuration_audit_log                | System health cards, recent changes, user activity |
| Schema Designer    | Configure dynamic forms              | GET/POST /schemas, GET/POST /form-fields | form_schemas, form_fields, schema_activity_categories          | Drag-drop form builder, field property panel, preview mode |
| User Management    | Manage system users                  | GET/POST/PUT /users, GET /facilities    | enhanced_users, facilities                                               | User table, role assignment, facility mapping   |
| Event Mapping      | Configure activity-event relationships | GET/POST /event-mappings, GET /events   | configurable_event_mappings, events, dynamic_activities         | Mapping matrix, formula editor, test calculations |
| System Configuration | Global system settings               | GET/PUT /configurations, GET /validation/rules | system_configurations, form_schemas                           | Configuration tree, validation rule editor, backup tools |
---

