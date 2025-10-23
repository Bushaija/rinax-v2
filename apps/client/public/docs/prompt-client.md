You are a senior product designer & frontend architect. Your job is to take my API and database schema and generate a client-facing dashboard design specification for a web app.

📌 Input Context:

- Project Name: budget monitoring system
- Primary Users: [List User Roles – e.g., Admin, Accountant, Manager, etc.]


API Design / DB Schema:


🎯 Task:

Activity Workflow for Each User

- Describe each user’s journey (step-by-step) in interacting with the system.
- Focus on what they see, what they do, and what data they consume or produce.

Core Features & Pages

- List the exact pages/screens each user needs.
- Map each page to its API endpoints & DB tables.
- Note any filters, forms, search, and table components required.

Wireframe-Level UI Suggestions

- Provide a textual wireframe description for each page.
- Include layout hints (Sidebar, Top Nav, Main Table, KPIs, Charts).
- Suggest any charts or graphs (bar chart, pie chart, trend line, etc.).

Frontend Roadmap

- Break down features into epics → stories → tasks for frontend engineers.
- Suggest reusable UI components (tables, modals, forms, filters, etc.).

🏗 Output Format:

- Use Markdown with clear sections and tables where helpful.

Example Output:

## Admin Dashboard – Budget Monitoring

### 👤 User Workflow
1. Log in → See overview of total budgets & spending per project.
2. Click "Manage Activities" → Table of all activities (sortable, searchable).
3. Click activity → Detail page (cost breakdown, history, edit button).
4. Approve / Reject activities → Confirmation modal.

### 📄 Pages & Features
| Page             | Purpose | API / DB Mapped | Components |
|------------------|--------|----------------|-----------|
| Dashboard        | High-level KPIs & charts | `/api/budget/summary` | KPI cards, bar chart |
| Activities List  | View & filter activities | `/api/activities` | Table, search input, filter dropdown |
| Activity Detail  | View single activity | `/api/activities/:id` | Read-only fields, edit button, history timeline |

### 🖼 Wireframe Suggestions
- **Sidebar:** Dashboard, Activities, Reports
- **Main Area:** KPI cards (top), activities table (below)
- **Charts:** Monthly spending trends (line chart)

### 🛠 Frontend Roadmap
- **Epic:** Activities Management
  - Story: List activities
    - Task: Build activity table component
    - Task: Add filtering/search
  - Story: View activity details
    - Task: Build activity detail page
    - Task: Add approval modal