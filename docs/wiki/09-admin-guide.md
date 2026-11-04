# Admin Guide

The Admin panel provides tools for managing the platform's users, processes, and data.

*Available to: Admin role only*

## Accessing the Admin Panel

Click **Admin** in the sidebar navigation. You'll see three tabs:

## User Management

### Viewing Users
A table of all users showing their name, email, role, and active status.

### Creating a User
1. Click **Create User** in the top-right
2. Fill in the form:
   - **Name** (required)
   - **Email** (required) — This is their login credential
   - **PIN** (required) — 6-8 digits, used for authentication
   - **Role** — SME, POC, Manager, Senior Leader, or Admin
   - **Team** — Which team/program they belong to
   - **Level** — Job level (e.g., L3, L4, L5)
   - **Location** — Office location
   - **Job Title** — Official title
3. Click **Create User**

### Changing a Role
1. Click the three-dot menu (⋯) on a user row
2. Select **Change Role**
3. Pick the new role from the dropdown
4. Click **Save**

The new permissions take effect on the user's next page navigation — they don't need to sign out and back in.

### Deactivating a User
1. Click the three-dot menu (⋯) on a user row
2. Select **Deactivate**

Deactivated users cannot sign in. Their data is preserved but their account is locked.

## Process Management

Processes represent the types of work in your organization. Each process has a **complexity factor** that indicates how demanding the work is.

### Viewing Processes
A table showing process name, complexity factor, and description.

### Creating a Process
1. Click **New Process**
2. Enter:
   - **Name** (required)
   - **Complexity Factor** — Between 0.5 (simple) and 3.0 (very complex). This multiplier is used in bandwidth calculations.
   - **Description** (optional)
3. Click **Create**

### Editing a Process
Click the pencil icon on a process row to modify its name, complexity factor, or description.

## Data Import/Export

### Importing Data (CSV)
Upload a CSV file to bulk-import associate data.

**Required columns:**
- `Associate name`
- `team`
- `Skills` (semicolon-separated, e.g., "STL;F2;Video")
- `Proficiency_Levels` (semicolon-separated, matching skills, e.g., "Expert;Proficient;Trained")

**Limits:**
- Maximum 2000 rows per import
- Invalid rows are skipped — you'll see an error summary with row numbers

### Exporting Data (CSV)
1. Optionally select a team to filter
2. Click **Download CSV**
3. The file includes: name, team, email, role, skills, proficiency levels, and bandwidth

## Efficiency Tracker

Found under **Admin** → navigate to `/admin/efficiency` (or via the sidebar if your middleware permits).

This allows admins to manually enter time on behalf of associates:
- Select an associate
- Select a process
- Pick a date
- Enter hours (0-7.5, in 0.25 increments)

Useful for bulk backfilling or correcting data when associates can't log their own time.

---

*Next: [FAQ →](./10-faq.md)*
