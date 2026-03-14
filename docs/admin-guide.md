# S-IMSY Reporting Portal -- Administrator Guide

This guide covers all features of the S-IMSY Reporting Portal from the administrator perspective, including user management, tenant scoping, pricing, revenue analysis, and data export.

---

## 1. Logging In

### Email + Password with 2FA

1. Enter your admin email and password on the sign-in page.
2. Click **Sign In**.
3. Check your email for a 6-digit verification code.
4. Enter the code and click **Verify Code**.

### Service Token (Legacy)

For API or automated access, you can also authenticate with a Cloudflare Access service token:

1. Click **Use a service token instead** on the sign-in page.
2. Enter your organisation name and service token.
3. Click **Sign In with Token**.

---

## 2. Navigation and Tenant Scoping

### Sidebar

The sidebar provides access to all views, organised into sections:

**Overview:** Dashboard

**Reports:** Usage Report, Bundle Report, Endpoints

**Analytics:** Roaming Analytics, Usage Trends, Cost Analysis, Export Data

**Settings:** User Management, API Documentation

### Global Scope Filters

As an administrator, a **Scope** filter bar appears at the top of every data view:

- **Tenant** dropdown -- Select a specific tenant organisation to view their data, or leave blank to see all data.
- **Customer** dropdown -- Further scope to a specific customer within the selected tenant.

Changing the tenant automatically reloads the customer list for that tenant. A **Clear** button appears when any filter is active.

The breadcrumb at the top of the page reflects the current scope (e.g., "S-IMSY > TenantName > CustomerName").

All data views respect these filters, so you can quickly switch between viewing global data and a specific tenant or customer's data.

---

## 3. Dashboard

The Dashboard provides a high-level overview across all tenants (or scoped to a selected tenant/customer).

### KPI Cards

- **Total Data Usage** -- Total billable data consumed. Use the dropdown to change the time period (7, 30, 90, 180, or 365 days).
- **Active Bundles** -- Count of active bundles.
- **Active Endpoints** -- Count of SIM endpoints.
- **Last Instances Expiring** -- Final-sequence bundle instances expiring within 30 days. Click to jump to the Bundle Report.

### Data Usage Chart

Line or bar chart showing data consumption over time. Toggle between **Daily**, **Monthly**, and **Annual** groupings.

### Bundle Health

Doughnut chart showing instance health distribution: Healthy (< 75%), Moderate (75-90%), Critical (> 90%), Depleted, Terminated. Click any legend item to jump to the Bundle Report filtered to that status.

### Alerts

Top 10 alerts ranked by severity:

| Alert | Severity | Condition |
|-------|----------|-----------|
| Bundle Depleted | Critical | Data allowance fully consumed |
| Final Bundle Expiring (< 7 days) | Critical | Last bundle in sequence expiring within 7 days |
| Stalled Sequence | Critical | Mid-sequence instance expired without a successor |
| Data Nearly Depleted (> 90%) | Warning | More than 90% of data allowance used |
| Bundle Expiring (< 14 days) | Warning | Bundle expiring within 14 days |

### Top Endpoints

Line chart showing monthly data consumption for the top 5 endpoints by average monthly usage.

---

## 4. Usage Report

Detailed usage records with full filtering and drill-down capability.

### Filters

- **ICCID** -- Search by full or partial ICCID
- **From / To** -- Date range
- **Columns** -- Toggle column visibility (saved in session)

### Table Columns

ICCID, Endpoint, Customer, Timestamp, Service, Bundle, Sequence, Data (charged consumption), Operator, Country, Status. Additional columns (off by default): Buy cost, Sell cost, Raw Bytes.

### ICCID Drill-Down

Click any ICCID to see:

- Summary cards: total records, charged data, raw bytes, bundle instances
- Bundle instances table with data usage progress bars
- Full usage records for that SIM

---

## 5. Active Bundles

Lists all bundles with expandable instance details.

### Status Tabs

Filter by All, Active, or Terminated.

### Bundle Details

Click **Details** on any bundle row to expand and see its instances, including:

- ICCID, Customer, Sequence, Data Used (progress bar), Start/End dates, Status
- **Efficiency rating**: Optimal (> 80% utilisation), Adequate (> 50%), Under-utilised (> 20%), Wasted (< 20%)

---

## 6. Bundle Report

Shows all bundle instances with status, data usage, and expiry tracking.

### Status Tabs

All, Active, Live, Depleted, Terminated, Stalled.

### Filters

- ICCID search (partial matching)
- Expiring before date picker

### Summary Cards

Clickable cards showing counts for Total, Active, Live, Depleted, and Terminated instances.

### Table

ICCID, Endpoint, Customer, Bundle, Sequence, Data Used (progress bar), Start, End, Days Left, Status. Rows are highlighted red (critical) or orange (warning) based on data usage and expiry proximity.

---

## 7. Endpoints

SIM endpoint cards with health indicators and anomaly detection.

### Card Information

- Health dot: green (active < 48h), amber (active < 14 days), red (inactive > 14 days)
- ICCID, status badge
- Anomaly flags: "High usage spike" or "Recently dormant"
- Rolling usage: 24h, 7d, 28d
- Endpoint type, last activity

### Detail View

Click a card to see a 90-day daily usage line chart.

---

## 8. Roaming Analytics

### Charts

- **Country Distribution** -- Top 10 countries by data (horizontal bar)
- **Operator Distribution** -- Top 10 operators by data (horizontal bar)
- **Home vs Roaming** -- Doughnut showing home vs roaming split with percentage

### Wholesale Network Cost

Table showing cost by country with columns: Country, Data, Wholesale Cost, Premium. Premium is the cost markup relative to the home-country baseline, colour-coded: green (baseline), orange (moderate), red (> 100% premium).

### Monthly Wholesale Cost by Customer

Expandable accordion showing monthly wholesale costs broken down by customer. Toggle between **Last 6 Months** and **Show All** (up to 24 months).

Each month expands to show a table: Customer, Data, Wholesale Cost, Records, Cost/MB.

---

## 9. Usage Trends

Monthly trend analysis (not available to customer-role users).

### Charts

- **Monthly Data Usage** -- Line chart showing total data per month (GB) over 12 months
- **Monthly Costs** -- Stacked bar chart: Buy (orange) and Sell (green)

### Summary Table

Month, Total Data, Records, Buy Total, Sell Total, Margin (green/red), Growth (month-over-month percentage change).

---

## 10. Cost Analysis

Full revenue and cost management.

### KPI Cards

- Total Buy Cost (last 30 days)
- Total Sell Revenue (last 30 days)
- Margin (revenue minus cost, with percentage)
- Cost per MB

### Charts

- **Buy vs Sell Over Time** -- Dual-line chart (30 days)
- **Top 10 Most Expensive ICCIDs** -- Table with ICCID, Buy cost, Data, Cost/MB

### Bundle Pricing

A matrix where rows are bundles and columns are tenant organisations. Enter monthly prices in the input fields and click **Save Prices**. Prices are used to calculate revenue across the portal.

### Revenue Analysis

Filter by tenant and customer using the dropdowns above the table.

| Column | Description |
|--------|-------------|
| Tenant | The tenant organisation |
| Customer | The customer name |
| Bundle | Bundle product name |
| Endpoints | Number of SIMs using this bundle |
| Size | Data allowance (GB) |
| Monthly Price | Price set in the pricing matrix |
| Revenue | Calculated as Monthly Price x Endpoints |

Grand total row shows overall revenue.

### Revenue vs Wholesale Cost Chart

Mixed chart (8 months) showing Revenue bars (green), Wholesale Cost bars (orange), and Margin line (cyan).

---

## 11. Export Data

Bulk export of data in CSV or JSON format (not available to customer-role users).

### Options

- **Report Type**: Usage Records, Active Bundles, Bundle Instances, Endpoints
- **Format**: CSV or JSON
- **Date Range**: From and To date pickers
- **ICCID Filter**: Optional -- export data for a specific SIM only

Click **Export Data** to download the file.

---

## 12. User Management

Accessible from **Settings > User Management** in the sidebar (opens the admin panel).

### User Roles

| Role | Access |
|------|--------|
| **Admin** | Full access to all views, all tenants, pricing, user management, sessions |
| **Tenant** | All data views scoped to their tenant + children, customer filter available |
| **Customer** | Dashboard, Usage, Bundle Report, Endpoints, Roaming (no wholesale costs), Cost (cost summary only) |

### Managing Users

The Users table shows: Email, Display Name, Role, Tenant, Status (Active/Inactive), Last Login.

**Actions per user:**

- **Edit** -- Change display name, role, tenant, customer assignment, or active status
- **Resend Invite** -- Send a new invitation email (shown for users who have not yet logged in)
- **Reset Password** -- Set a new password (minimum 12 characters)
- **Activate/Deactivate** -- Toggle the user's ability to log in
- **Delete** -- Permanently remove the user and all their sessions

### Inviting New Users

1. Click **Invite User**.
2. Enter email, display name, and select a role.
3. Select the tenant organisation.
4. For customer-role users, enter the customer name.
5. Click **Send Invite**.

The user receives an email with a link to set their password. The link expires in 48 hours.

### Active Sessions

View all currently active user sessions from **Sessions** in the admin sidebar.

Table shows: User Email, Display Name, Role, IP Address, Issued At, Expires At.

Click **Revoke** to immediately sign out a user and invalidate their session.

---

## 13. Security Model

### Authentication

- Email + password with email-based 2FA (OTP) for all browser sessions
- Cloudflare Access service tokens for API/automated access
- Sessions stored server-side with JWT tokens
- Minimum password length: 12 characters

### Tenant Isolation

- All data queries are scoped by tenant using Row-Level Security (RLS) in PostgreSQL
- Only the S-IMSY platform admin (tenant_id = "s-imsy") has cross-tenant access
- Sub-tenant admins see their own data plus child tenant data
- Customer-role users are always restricted to their own customer data

### API Access

The API base URL and authentication details are available from:

- The **API Access** tab on the sign-in page
- The **API Documentation** link in the sidebar

API authentication supports both JWT Bearer tokens and Cloudflare Access service tokens.

---

## 14. Data Pipeline

Understanding how data flows into the portal:

1. **S-IMSY Core API** -- The source system that manages SIMs, bundles, and usage data
2. **Report Collector** (Supabase Edge Function) -- Fetches data from the Core API and stores it in Supabase
3. **Sync Worker** (Cloudflare Worker, runs every 30 minutes) -- Syncs data from Supabase to the reporting database (Hetzner PostgreSQL)
4. **Reporting API** (Cloudflare Worker) -- Serves the REST API that the portal queries
5. **Portal** (Cloudflare Pages) -- The frontend you are using

Data is refreshed every 30 minutes. Rolling usage stats on endpoint cards (24h, 7d, 28d) are pre-computed by the Core API and updated with each sync cycle.

### Key Identifiers

- **ICCID** -- The 19-digit SIM card identifier. This is the primary constant identifier across all systems.
- **Endpoint Name** -- A human-readable label assigned to a SIM (may be empty for some SIMs).
- **Bundle Sequence** -- Bundles are ordered in sequences (e.g., 1/4, 2/4). When one expires, the next in sequence should activate.

---

## 15. Role Access Summary

| View | Admin | Tenant | Customer |
|------|-------|--------|----------|
| Dashboard | Full | Full | Full |
| Usage Report | Full | Scoped | Scoped |
| Active Bundles | Full | Scoped | Scoped |
| Bundle Report | Full | Scoped | Scoped |
| Endpoints | Full | Scoped | Scoped |
| Roaming Analytics | Full | Full | No wholesale costs |
| Usage Trends | Full | Full | Hidden |
| Cost Analysis | Full + Pricing | Full (no pricing) | Cost summary only |
| Export Data | Full | Full | Hidden |
| User Management | Full | Hidden | Hidden |
| Active Sessions | Full | Hidden | Hidden |
| Tenant Filter | Available | Hidden | Hidden |
| Customer Filter | Available | Available | Hidden |
