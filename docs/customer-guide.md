# S-IMSY Reporting Portal -- Customer User Guide

Welcome to the S-IMSY Reporting Portal. This guide covers everything you need to get started viewing your IoT SIM data, monitoring bundle usage, and understanding your costs.

---

## 1. Logging In

### Step 1: Enter Your Credentials

Open the portal in your browser. You will see a sign-in form.

1. Enter the **email address** and **password** provided by your S-IMSY administrator.
2. Click **Sign In**.

### Step 2: Enter Your Verification Code

For security, the portal uses email-based two-factor authentication. After signing in:

1. Check your email inbox for a 6-digit verification code.
2. Enter the code into the six boxes on screen. You can type each digit or paste the full code.
3. Click **Verify Code**.

You will be taken to the Dashboard.

### First-Time Login

If you received an invitation email, click the link in the email. You will be asked to set a password (minimum 12 characters). After setting your password, you will be redirected to the sign-in page.

### Forgot Password

1. Click **Forgot your password?** on the sign-in page.
2. Enter your email address and click **Send Reset Code**.
3. Check your email for the reset code.
4. Enter the code, your new password (minimum 12 characters), and confirm it.
5. Click **Reset Password**, then sign in with your new credentials.

---

## 2. Navigation

The sidebar on the left contains links to all available views:

- **Dashboard** -- Overview of your data usage, bundle health, and alerts
- **Usage Report** -- Detailed usage records for every SIM
- **Bundle Report** -- Status of all your bundle instances
- **Endpoints** -- SIM endpoint cards with health indicators
- **Roaming Analytics** -- Country and operator breakdown of your data usage
- **Cost Analysis** -- Your bundle costs

Click any link to switch views. On mobile devices, tap the menu icon in the top-left corner to open the sidebar.

Your organisation name and current view are shown in the breadcrumb bar at the top of the page.

To sign out, click **Sign Out** in the top-right corner.

---

## 3. Dashboard

The Dashboard gives you a quick overview of your IoT connectivity.

### KPI Cards

Four summary cards appear at the top:

- **Total Data Usage** -- Total billable data consumed. Use the dropdown in the top-right corner of this card to change the time period (7, 30, 90, 180, or 365 days).
- **Active Bundles** -- Number of bundles currently active.
- **Active Endpoints** -- Number of SIM endpoints.
- **Last Instances Expiring** -- Number of final-sequence bundle instances expiring within 30 days. Click this card to jump to the Bundle Report filtered to these instances.

### Data Usage Chart

A chart showing your data consumption over time. Use the **Daily / Monthly / Annual** toggle to change the grouping. Daily view follows the time period selected on the Total Data Usage card.

### Bundle Health

A doughnut chart showing the health of your bundle instances:

- **Healthy** (green) -- Less than 75% of data allowance used
- **Moderate** (blue) -- 75-90% used
- **Critical** (orange) -- More than 90% used
- **Depleted** (red) -- Data allowance exhausted
- **Terminated** (grey) -- Bundle expired

Click any category in the legend to jump to the Bundle Report filtered to that status.

### Alerts

A panel showing the most urgent issues requiring your attention:

- **Bundle Depleted** -- A SIM has used all its data
- **Final Bundle Expiring** -- The last bundle in a sequence is about to expire
- **Stalled Sequence** -- A mid-sequence bundle expired without a successor being activated
- **Data Nearly Depleted** -- A SIM has used more than 90% of its data
- **Bundle Expiring** -- A bundle is expiring within 14 days

Critical alerts appear in red, warnings in orange. Up to 10 alerts are shown.

### Top Endpoints

A line chart showing monthly data consumption for your top 5 most active SIMs.

---

## 4. Usage Report

The Usage Report shows every data usage record for your SIMs.

### Searching and Filtering

- **ICCID** -- Type a full or partial ICCID to search for a specific SIM. Press Enter or click Search.
- **From / To dates** -- Restrict results to a date range.
- **Columns** -- Click the Columns button to show or hide table columns.

Click **Clear** to reset all filters.

### Understanding the Table

Each row represents a single usage record:

| Column | Description |
|--------|-------------|
| ICCID | The SIM card identifier (19-digit number) |
| Endpoint | The endpoint name assigned to this SIM |
| Customer | Your organisation name |
| Timestamp | When the usage occurred |
| Service | The service type (e.g., data) |
| Bundle | The bundle name providing this data |
| Seq | Sequence number (e.g., 2/4 means the 2nd bundle in a 4-bundle sequence) |
| Data | Billable data consumption |
| Operator | The mobile network operator used |
| Country | The country where the data was consumed |
| Status | The usage record status |

### ICCID Detail View

Click any ICCID in the table to see a detailed breakdown for that SIM:

- **Summary cards** showing total records, total data, raw bytes, and bundle instances
- **Bundle Instances** table with data usage progress bars showing how much of each bundle's allowance has been consumed
- **Usage Records** table with all records for this SIM

Data progress bars are colour-coded:
- Green: less than 75% used
- Blue: 75-90% used
- Orange: 90-100% used
- Red: over 100% (overage)

Click **Back to Usage** to return to the main table.

---

## 5. Bundle Report

The Bundle Report shows all your bundle instances and their current status.

### Status Tabs

Use the tabs at the top to filter by status:

- **All** -- Every instance
- **Active** -- Currently active bundles
- **Live** -- Bundles marked as Live by the network
- **Depleted** -- Bundles that have used all their data allowance
- **Terminated** -- Bundles that have expired
- **Stalled** -- Mid-sequence bundles that expired without a successor

### Searching

- **ICCID** -- Search for a specific SIM by full or partial ICCID
- **Expiring before** -- Show instances expiring before a specific date

### Summary Cards

Five cards at the top show counts for each status. Click any card to filter the table to that status.

### Understanding the Table

| Column | Description |
|--------|-------------|
| ICCID | The SIM identifier (hover to see the full number) |
| Endpoint | Endpoint name |
| Customer | Your organisation name |
| Bundle | The bundle product name |
| Sequence | Position in the bundle sequence (e.g., 2/4) |
| Data Used | Progress bar showing data consumed vs allowance |
| Start | Bundle activation date |
| End | Bundle expiry date |
| Days Left | Days until expiry (red if less than 7 days) |
| Status | Current status |

Rows are highlighted:
- **Red border** -- Critical: data fully used, or final instance expiring in less than 7 days
- **Orange border** -- Warning: expiring soon or data above 85%

---

## 6. Endpoints

The Endpoints view shows each SIM as a card with health indicators.

### Searching

- Type a name or ICCID in the search box and press Enter or click Search.
- Use the status dropdown to filter by Active, Suspended, or Deactivated.

### Understanding the Cards

Each card shows:

- **Health indicator** (coloured dot):
  - Green: active within the last 48 hours with recent data usage
  - Amber: active within 14 days, or no recent usage but some historical usage
  - Red: inactive for more than 14 days
- **ICCID** -- The SIM identifier
- **Status badge** -- Active, Suspended, etc.
- **Anomaly flags** (if any):
  - "High usage spike" (red) -- Weekly usage is more than 3x the average
  - "Recently dormant" (orange) -- No usage in the last 7 days despite usage in the last 28 days
- **Rolling usage** -- Data consumed in the last 24 hours, 7 days, and 28 days
- **Endpoint type** and **last activity** timestamp

### Endpoint Detail

Click any card to see a line chart of daily data usage over the last 90 days. Click **Back to Endpoints** to return.

---

## 7. Roaming Analytics

The Roaming Analytics view shows where your SIMs are consuming data.

### Country Distribution

A horizontal bar chart showing the top 10 countries by data consumption.

### Operator Distribution

A horizontal bar chart showing the top 10 mobile network operators by data consumption.

### Home vs Roaming

A doughnut chart showing how much data is consumed on the home network versus roaming networks, along with the roaming percentage.

---

## 8. Cost Analysis

The Cost Analysis view shows your bundle costs.

### Cost Summary Table

A table showing your costs broken down by bundle:

| Column | Description |
|--------|-------------|
| Bundle | The bundle product name |
| Endpoints | Number of SIMs using this bundle |
| Size | Data allowance (GB) |
| Monthly Price | The monthly cost per bundle |
| Cost | Total cost for all endpoints on this bundle |

A **Total** row at the bottom shows the overall cost across all bundles.

---

## 9. Tips

- **Data is refreshed automatically** every 30 minutes via the sync system. The rolling usage stats on endpoint cards (24h, 7d, 28d) update with each sync.
- **Use the Dashboard alerts** to stay on top of expiring or depleted bundles before they affect your connectivity.
- **Click ICCIDs** in the Usage Report to drill down into individual SIM details and see exactly how data allowances are being consumed.
- **Bundle sequence numbers** (e.g., 2/4) tell you where a SIM is in its bundle lifecycle. When the final bundle in a sequence is about to expire, you will see an alert.
- **All data values shown as "Data" or "Usage"** represent billable (charged) consumption, not raw bytes transferred.
