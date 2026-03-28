# Kafel Admin Dashboard -- Technical Specification

**Version:** 1.0
**Last Updated:** 2026-03-27
**Status:** Draft -- Ready for Engineering Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Role-Based Access Control (RBAC)](#2-role-based-access-control-rbac)
3. [Dashboard Pages & Features](#3-dashboard-pages--features)
4. [Data Visibility Matrix](#4-data-visibility-matrix)
5. [API Endpoints & Supabase Queries](#5-api-endpoints--supabase-queries)
6. [Tech Stack Recommendation](#6-tech-stack-recommendation)
7. [Security Considerations](#7-security-considerations)
8. [Deployment](#8-deployment)

---

## 1. Executive Summary

### 1.1 Purpose

The Kafel Admin Dashboard is a Next.js web application that provides internal operations teams with full visibility and control over the Kafel marketplace platform. Kafel is a React Native (Expo) mobile app operating in the Saudi Arabian market that facilitates three service types:

- **Tanazul** (worker transfer services)
- **Taqib** (government follow-up/processing services)
- **Damin** (escrow-backed service guarantees between two parties)

### 1.2 Core Responsibilities

The dashboard must handle:

1. **Bank Transfer Approval Queue** -- The most time-sensitive operation. When users pay via bank transfer, the order enters `awaiting_admin_transfer_approval` status. An admin must view the uploaded transfer receipt image and approve or reject the payment. This is the critical-path bottleneck for order flow.
2. **Withdrawal Request Processing** -- Users request wallet withdrawals with IBAN details. Admins verify and process these manually via the platform's bank.
3. **Order Lifecycle Management** -- Full visibility into both regular orders (tanazul/taqib) and damin orders, with the ability to intervene at any status.
4. **Dispute Resolution** -- When orders enter `disputed` status, admins must investigate (view chat history, order details, payment proofs) and take action (refund, release funds, cancel).
5. **Content & Configuration Management** -- Home sliders/banners, commission rates, and ad moderation.
6. **User Management** -- View profiles, handle bans/suspensions, and investigate user activity.
7. **Push Notification Broadcasting** -- Send targeted or bulk push notifications to users via Expo Push.

### 1.3 Key Metrics (Dashboard KPIs)

| KPI | Source |
|-----|--------|
| Total registered users | `COUNT(*)` from `profiles` |
| Active users (last 30 days) | `user_push_tokens.last_seen_at` within 30 days |
| Pending bank transfer approvals | `orders WHERE status = 'awaiting_admin_transfer_approval'` |
| Pending withdrawal requests | `withdrawal_requests WHERE status = 'pending'` |
| Active orders (regular) | `orders WHERE status NOT IN ('completed', 'cancelled', 'refunded')` |
| Active damin orders | `damin_orders WHERE status NOT IN ('completed', 'cancelled')` |
| Total revenue (commission collected) | SUM of commission from completed orders |
| Open disputes | `orders WHERE status = 'disputed'` + `damin_orders WHERE status = 'disputed'` |
| Total escrow held | Aggregate from wallet RPC or direct query |

---

## 2. Role-Based Access Control (RBAC)

### 2.1 Role Definitions

| Role | Description | Typical User |
|------|-------------|--------------|
| **Super Admin** | Full access to all features. Can manage other admin users, modify commission settings, and perform destructive actions (delete users, force-complete orders). | CTO, CEO, Lead Operations |
| **Finance Admin** | Full access to financial operations: bank transfer approvals, withdrawal processing, commission tracking, revenue reports. Read-only access to orders and users. | Finance Manager, Accountant |
| **Support Agent** | Can view orders, users, chats (for disputes), and manage dispute resolution. Can update order statuses. Cannot access financial settings or commission configuration. | Customer Support Team |
| **Viewer** | Read-only access to dashboards, orders, and users. Cannot perform any mutations. Used for stakeholders who need visibility. | Investors, Auditors, Product Managers |

### 2.2 Implementation

Admin roles are stored in a new `admin_users` table (not part of the mobile app's schema):

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'finance_admin', 'support_agent', 'viewer')),
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'order', 'damin_order', 'user', 'withdrawal', etc.
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Admin authentication is separate from mobile user auth. The dashboard authenticates via its own session system (NextAuth.js or custom JWT) and uses the **Supabase service role key** to bypass RLS for all database operations.

---

## 3. Dashboard Pages & Features

### 3.1 Overview Dashboard (`/`)

The landing page after login. Provides a real-time snapshot of platform health.

#### 3.1.1 KPI Cards (Top Row)

| Card | Value | Alert Condition |
|------|-------|-----------------|
| Pending Transfer Approvals | Count of `orders.status = 'awaiting_admin_transfer_approval'` | Red badge if > 0 (requires immediate action) |
| Pending Withdrawals | Count of pending `withdrawal_requests` | Yellow badge if > 5 |
| Active Orders | Count of non-terminal regular orders | Informational |
| Active Damin Orders | Count of non-terminal damin orders | Informational |
| Open Disputes | Count of disputed orders + disputed damin orders | Red badge if > 0 |
| Today's Revenue | Sum of commissions from orders completed today | Informational |
| Total Users | Count of `profiles` | Informational |
| Total Escrow Held | Sum of funds currently in escrow | Informational |

#### 3.1.2 Charts

- **Orders by Status** -- Donut chart showing distribution across all statuses.
- **Revenue Over Time** -- Line chart (daily/weekly/monthly toggle) showing commission revenue.
- **New Users Over Time** -- Bar chart of user registrations.
- **Order Volume by Type** -- Stacked bar chart (tanazul vs. taqib vs. damin).

#### 3.1.3 Recent Activity Feed

A scrollable list of the latest 20 events:
- New order created
- Bank transfer submitted (needs approval)
- Withdrawal request submitted
- Dispute filed
- Order completed

---

### 3.2 User Management (`/users`)

#### 3.2.1 User List Page

**Table Columns:**
| Column | Source |
|--------|--------|
| User ID | `profiles.user_id` |
| Display Name | `profiles.display_name` |
| Phone | `auth.users.phone` (via service role) |
| Email | `profiles.email` |
| Avatar | `profiles.avatar_url` (thumbnail) |
| Profile Complete | `profiles.is_profile_complete` |
| Registered At | `auth.users.created_at` |
| Last Active | `user_push_tokens.last_seen_at` |
| Orders Count | Aggregate from `orders` + `damin_orders` |
| Status | Active / Suspended / Banned |

**Filters:**
- Search by name, phone, email, or user ID
- Filter by status (Active / Suspended / Banned)
- Filter by registration date range
- Filter by profile completion status

**Actions:**
- View user detail page
- Suspend user (sets `is_suspended = true` on profile, revokes active sessions)
- Ban user (permanent, with reason)
- Send push notification to user

#### 3.2.2 User Detail Page (`/users/[id]`)

**Sections:**
1. **Profile Information** -- Display name, phone, email, avatar, language preference, theme, registration date
2. **Wallet Summary** -- Available balance, escrow held, total earned, total withdrawn (via `get_wallet_summary` RPC with service role override or direct query)
3. **Order History** -- Table of all orders (regular + damin) involving this user, sorted by date
4. **Chat Conversations** -- List of conversations this user is a member of
5. **Push Tokens** -- Active device tokens (platform, device ID, last seen)
6. **Ads Posted** -- List of ads created by this user
7. **Withdrawal History** -- All withdrawal requests by this user
8. **Activity Log** -- Admin actions taken on this user

---

### 3.3 Order Management (`/orders`)

This is the most complex and most frequently used section. It has two tabs.

#### 3.3.1 Regular Orders Tab (`/orders/regular`)

**Table Columns:**
| Column | Source |
|--------|--------|
| Order ID | `orders.id` (truncated UUID) |
| Ad Title | `ads.title` (joined) |
| Ad Type | `ads.type` (tanazul / taqib) |
| Buyer | `profiles.display_name` via `orders.buyer_id` |
| Seller | `profiles.display_name` via `orders.seller_id` |
| Amount | `orders.amount` + `orders.currency` |
| Payment Method | `orders.payment_method` |
| Status | `orders.status` (color-coded badge) |
| Created At | `orders.created_at` |
| Updated At | `orders.updated_at` |

**Status Color Coding:**
| Status | Color | Priority |
|--------|-------|----------|
| `awaiting_payment` | Gray | Low |
| `payment_submitted` | Yellow | Medium |
| `awaiting_admin_transfer_approval` | Red (pulsing) | CRITICAL |
| `payment_verified` | Green | Low |
| `in_progress` | Blue | Low |
| `completion_requested` | Orange | Medium |
| `completed` | Green (solid) | None |
| `disputed` | Red | High |
| `cancelled` | Gray (muted) | None |
| `refunded` | Purple | None |

**Filters:**
- Status filter (multi-select)
- Ad type filter (tanazul / taqib)
- Date range
- Payment method (bank_transfer / card / apple_pay)
- Search by order ID, buyer name/phone, seller name/phone

**Quick Filter Buttons:**
- "Needs Approval" -- Shortcut to `status = 'awaiting_admin_transfer_approval'`
- "Disputes" -- Shortcut to `status = 'disputed'`
- "Active" -- All non-terminal statuses

#### 3.3.2 Bank Transfer Approval Queue (`/orders/transfer-approvals`)

**This is the highest-priority page in the entire dashboard.**

**Layout:** Card-based queue (not a table). Each card shows:

```
+-------------------------------------------------------+
| ORDER #a1b2c3d4                    Submitted 5 min ago |
| Ad: "Filipino Worker Transfer" (Tanazul)               |
| Buyer: Mohammed Ali (+966501234567)                    |
| Seller: Ahmed Hassan (+966509876543)                   |
| Amount: 8,500.00 SAR                                  |
| Transfer Phone: +966501234567                          |
|                                                        |
| [Transfer Receipt Image - Click to enlarge]            |
| [Full-screen modal with zoom on click]                 |
|                                                        |
| [ APPROVE ]  [ REJECT (with reason) ]                 |
+-------------------------------------------------------+
```

**Approve Action:**
- Calls `approve_service_bank_transfer(p_order_id)` RPC
- Sets `transfer_approved_at`, `payment_verified_at`, status -> `payment_verified`
- Sends push notification to buyer: "Your bank transfer has been verified"
- Logs action in `admin_audit_log`

**Reject Action:**
- Opens modal for rejection reason (required field)
- Calls `reject_service_bank_transfer(p_order_id, p_reason)` RPC
- Sets `transfer_rejected_at`, `transfer_rejected_reason`, status -> `awaiting_payment`
- Sends push notification to buyer: "Your bank transfer was rejected: {reason}. Please resubmit."
- Logs action in `admin_audit_log`

**Real-time Updates:**
- Subscribe to `postgres_changes` on `orders` table where `status = 'awaiting_admin_transfer_approval'`
- New submissions appear at the top with a sound/visual notification
- Auto-remove cards when another admin processes them

#### 3.3.3 Damin Orders Tab (`/orders/damin`)

**Table Columns:**
| Column | Source |
|--------|--------|
| Order ID | `damin_orders.id` |
| Service Details | `damin_orders.service_type_or_details` |
| Creator | `profiles.display_name` via `creator_id` |
| Payer | Phone or linked profile via `payer_phone` / `payer_user_id` |
| Beneficiary | Phone or linked profile via `beneficiary_phone` / `beneficiary_user_id` |
| Service Value | `damin_orders.service_value` SAR |
| Commission | `damin_orders.commission` SAR |
| Total | `damin_orders.total_amount` SAR |
| Status | `damin_orders.status` (color-coded) |
| Payer Confirmed | `payer_confirmed_at` (check/cross icon) |
| Beneficiary Confirmed | `beneficiary_confirmed_at` (check/cross icon) |
| Created At | `damin_orders.created_at` |

**Damin Status Color Coding:**
| Status | Color |
|--------|-------|
| `created` | Gray |
| `pending_confirmations` | Yellow |
| `both_confirmed` | Blue |
| `escrow_deposit` | Cyan |
| `awaiting_completion` | Blue |
| `awaiting_payment` | Yellow |
| `payment_submitted` | Orange |
| `completion_requested` | Orange |
| `completed` | Green |
| `disputed` | Red |
| `cancelled` | Gray (muted) |

**Filters:**
- Status filter (multi-select)
- Date range
- Search by order ID, payer phone, beneficiary phone, creator name

#### 3.3.4 Order Detail Page (`/orders/[type]/[id]`)

Unified detail page for both regular and damin orders.

**Sections:**

1. **Order Header** -- Status badge (large), order ID, creation date, last updated
2. **Status Timeline** -- Visual timeline showing all state transitions with timestamps:
   - For regular orders: `awaiting_payment -> payment_submitted -> awaiting_admin_transfer_approval -> payment_verified -> in_progress -> completion_requested -> completed`
   - For damin orders: `created -> pending_confirmations -> both_confirmed -> escrow_deposit -> awaiting_completion -> completed`
3. **Party Information** -- Buyer/Seller (or Payer/Beneficiary/Creator) with linked profiles and phone numbers
4. **Financial Details** -- Amount breakdown (service value, commission, tax, total)
5. **Payment Information** -- Payment method, transfer receipt image (if bank transfer), Paymob payment ID (if card), approval/rejection history
6. **Receipt/Contract** -- Link to the signed receipt PDF (from `receipts.pdf_path`)
7. **Related Conversation** -- Link to view the chat conversation associated with this order
8. **Dispute Details** -- If disputed: dispute reason, timestamp, assigned agent
9. **Completion Requests** -- For damin orders: list of `damin_completion_requests`
10. **Admin Actions Panel:**

| Action | Conditions | Effect |
|--------|-----------|--------|
| Approve Transfer | Status = `awaiting_admin_transfer_approval` | -> `payment_verified` |
| Reject Transfer | Status = `awaiting_admin_transfer_approval` | -> `awaiting_payment` |
| Force Complete | Status = any active | -> `completed`, release escrow |
| Force Cancel | Status = any active | -> `cancelled` |
| Issue Refund | Status = `completed` or `disputed` | -> `refunded`, reverse wallet transaction |
| Resolve Dispute | Status = `disputed` | Choose: complete, cancel, or refund |
| Override Status | Super Admin only | Set to any valid status |
| Add Admin Note | Any status | Stored in `metadata.admin_notes[]` |

---

### 3.4 Financial Management (`/finance`)

#### 3.4.1 Wallet Overview (`/finance/wallets`)

**Summary Cards:**
- Total platform balance (sum of all user wallets)
- Total escrow held across all active orders
- Total pending withdrawals
- Today's commission income

**User Wallet Table:**
| Column | Source |
|--------|--------|
| User | `profiles.display_name` |
| Phone | `auth.users.phone` |
| Available Balance | From wallet query |
| Escrow Held | From wallet query |
| Total Earned | From wallet query |
| Total Withdrawn | From wallet query |

#### 3.4.2 Withdrawal Requests Queue (`/finance/withdrawals`)

**This is the second highest-priority page.**

**Table Columns:**
| Column | Source |
|--------|--------|
| Request ID | `withdrawal_requests.id` |
| User | Profile display name + phone |
| Amount | `withdrawal_requests.amount` SAR |
| IBAN | `withdrawal_requests.iban` (masked, reveal on click) |
| Bank Name | `withdrawal_requests.bank_name` |
| Account Holder | `withdrawal_requests.account_holder_name` |
| Status | pending / approved / rejected / processed |
| Submitted At | `withdrawal_requests.created_at` |

**Actions per Request:**
- **Approve** -- Mark as approved, debit user wallet
- **Reject** -- With reason, credit back to user wallet
- **Mark as Processed** -- After actual bank transfer is initiated (separate from approve)

**Verification Checklist (displayed alongside each request):**
- Does the account holder name match the user's profile name?
- Is the IBAN format valid for Saudi banks? (SA + 2 check digits + 22 digits)
- Does the user have sufficient available balance?
- Has the user completed KYC / profile verification?

#### 3.4.3 Commission Tracking (`/finance/commissions`)

**Table:** All commission entries from completed orders

| Column | Source |
|--------|--------|
| Order ID | Reference to order |
| Order Type | tanazul / taqib / damin |
| Service Amount | Base amount |
| Commission Rate | Percentage or flat amount |
| Commission Amount | Calculated commission |
| Completed At | When order reached `completed` |

**Summary:**
- Total commission earned (all time, this month, this week, today)
- Commission by service type (pie chart)
- Commission trend over time (line chart)

#### 3.4.4 Commission Settings (`/finance/settings`)

**Current Settings Table** (from `commission_settings` table, fetched via `get_commission_settings` RPC):

| Field | Description |
|-------|-------------|
| Service Type | tanazul / taqib / damin |
| Commission Type | `percentage` or `flat` |
| Rate / Amount | e.g., 10% or 50 SAR |
| Label (EN) | English display label |
| Label (AR) | Arabic display label |
| Tax Enabled | Boolean |
| Tax Rate | If tax enabled |

**Edit Form:** Update commission rates per service type. Changes take effect for new orders only. Requires Super Admin role.

#### 3.4.5 Revenue Reports (`/finance/reports`)

- Filterable by date range, service type, payment method
- Export to CSV/Excel
- Charts: daily revenue, cumulative revenue, revenue by payment method

---

### 3.5 Chat Monitoring (`/chats`)

Used primarily for dispute investigation. Admins can view any conversation.

#### 3.5.1 Conversation List

**Table Columns:**
| Column | Source |
|--------|--------|
| Conversation ID | `conversations.id` |
| Type | `conversations.type` (dm/group) |
| Participants | Joined from `conversation_members` -> `profiles` |
| Related Ad | `conversations.ad_id` -> `ads.title` |
| Related Order | Latest order for this conversation |
| Last Message | `messages` (latest) |
| Message Count | Count of messages |
| Created At | `conversations.created_at` |

**Filters:**
- Has active order
- Has dispute
- Search by participant name/phone
- Date range

#### 3.5.2 Conversation Detail (`/chats/[id]`)

**Layout:** Chat viewer (read-only by default) showing:

1. **Message Thread** -- Full message history with:
   - Sender name and avatar
   - Message content
   - Attachments (images displayed inline, files as download links, receipts as PDF previews)
   - Timestamps
   - System messages (order created, payment received, etc.)

2. **Sidebar:**
   - Participant profiles (links to user detail pages)
   - Related ad details
   - Related order(s) with status badges
   - Quick actions: "Go to Order", "View Dispute"

3. **Admin Actions:**
   - Send system message (as "Kafel Support") -- for dispute mediation
   - Export conversation as PDF (for legal records)

---

### 3.6 Dispute Resolution (`/disputes`)

A dedicated workflow view for managing disputes.

#### 3.6.1 Dispute Queue

**Table Columns:**
| Column | Source |
|--------|--------|
| Order ID | `orders.id` or `damin_orders.id` |
| Order Type | regular / damin |
| Dispute Reason | `orders.dispute_reason` or `damin_orders.dispute_reason` |
| Filed At | `orders.disputed_at` or derived from metadata |
| Parties | Buyer/Seller or Payer/Beneficiary |
| Amount at Stake | Order amount |
| Assigned Agent | From `metadata.assigned_agent` |
| Priority | Auto-calculated based on amount and age |

**Workflow:**
1. New disputes appear as "Unassigned"
2. Support Agent or Super Admin assigns to themselves or another agent
3. Agent investigates (views order detail, chat history, payment proofs)
4. Agent resolves with one of:
   - **Complete Order** -- Release funds to seller/beneficiary (service was delivered)
   - **Full Refund** -- Return funds to buyer/payer (service not delivered)
   - **Partial Refund** -- Split funds (negotiated resolution)
   - **Cancel Order** -- Cancel without financial action (requires manual handling)

#### 3.6.2 Dispute Detail (`/disputes/[id]`)

Combines:
- Order detail (full information)
- Chat history (inline viewer)
- Admin notes and resolution history
- Resolution action buttons

---

### 3.7 Push Notification Management (`/notifications`)

#### 3.7.1 Send Notification (`/notifications/send`)

**Form Fields:**
| Field | Description |
|-------|-------------|
| Target | All users / Specific user(s) / By filter (e.g., users with active orders) |
| Title (EN) | English notification title |
| Title (AR) | Arabic notification title |
| Body (EN) | English notification body |
| Body (AR) | Arabic notification body |
| Data | Optional JSON payload for deep linking |
| Schedule | Send now or schedule for later |

**Implementation:**
- Fetches all `expo_push_token` values from `user_push_tokens` for target users
- Sends via Expo Push Notification Service (batch API)
- Tracks delivery statistics

#### 3.7.2 Notification History (`/notifications/history`)

Table of all admin-sent notifications with:
- Timestamp
- Target (audience description)
- Title/Body content
- Delivery stats (sent, delivered, failed)
- Sent by (admin name)

#### 3.7.3 Notification Statistics

- Total notifications sent (today, this week, this month)
- Delivery success rate
- Active push token count by platform (iOS vs. Android)

---

### 3.8 Content Management (`/content`)

#### 3.8.1 Home Sliders / Banners (`/content/sliders`)

Manage the promotional banners displayed on the mobile app home screen.

**Current Sliders Table:**
| Column | Source |
|--------|--------|
| Sort Order | `home_sliders.sort_order` |
| Badge (EN/AR) | `badge_en` / `badge_ar` |
| Title (EN/AR) | `title_en` / `title_ar` |
| Subtitle (EN/AR) | `subtitle_en` / `subtitle_ar` |
| Gradient | `gradient_palette` (visual preview swatch) |
| Icon | `icon_name` (rendered icon preview) |
| Background Image | `background_image_url` (thumbnail) |
| Active | `is_active` toggle |
| Preview | Live preview of how slider looks on mobile |

**Actions:**
- Create new slider
- Edit existing slider
- Reorder via drag-and-drop (updates `sort_order`)
- Toggle active/inactive
- Delete slider
- Upload background image to Supabase Storage

**Allowed Gradient Palettes:** `amber_burst`, `emerald_flow`, `violet_rush`, `ocean_wave`, `rose_glow`, `slate_night`

**Allowed Icon Names:** `trending_up`, `check_circle`, `zap`, `shield`

#### 3.8.2 Commission Configuration (`/content/commission`)

Same as Section 3.4.4. Cross-linked from both Finance and Content menus.

---

### 3.9 Ads Management (`/ads`)

#### 3.9.1 Ad List

**Table Columns:**
| Column | Source |
|--------|--------|
| Ad ID | `ads.id` |
| Title | `ads.title` |
| Type | `ads.type` (tanazul / taqib / dhamen) |
| Owner | `profiles.display_name` via `ads.owner_id` |
| Price | `ads.price` SAR (null for taqib) |
| Location | `ads.location` |
| Images | Count from `ad_images` |
| Orders | Count of orders linked to this ad |
| Created At | `ads.created_at` |
| Status | Active / Hidden / Flagged |

**Filters:**
- Type filter (tanazul / taqib / dhamen)
- Search by title, owner name, location
- Date range
- Status filter

**Actions:**
- View ad detail
- Hide/unhide ad (soft delete via `is_hidden` flag or metadata)
- Feature ad (pin to top of listings)
- Flag ad for review
- Delete ad (hard delete -- Super Admin only)

#### 3.9.2 Ad Detail (`/ads/[id]`)

- Full ad information with all metadata fields rendered
- Image gallery viewer
- Owner profile link
- All conversations spawned from this ad
- All orders created from this ad
- Moderation actions

---

## 4. Data Visibility Matrix

| Feature / Data | Super Admin | Finance Admin | Support Agent | Viewer |
|----------------|:-----------:|:-------------:|:-------------:|:------:|
| **Overview Dashboard** | Full | Full | Full | Full |
| **User List** | Read/Write | Read | Read | Read |
| **User Suspend/Ban** | Yes | No | No | No |
| **Regular Orders (view)** | Yes | Yes | Yes | Yes |
| **Regular Orders (update status)** | Yes | No | Yes | No |
| **Damin Orders (view)** | Yes | Yes | Yes | Yes |
| **Damin Orders (update status)** | Yes | No | Yes | No |
| **Bank Transfer Approve/Reject** | Yes | Yes | No | No |
| **Withdrawal Approve/Reject** | Yes | Yes | No | No |
| **Wallet Balances** | Yes | Yes | No | No |
| **Commission Settings (view)** | Yes | Yes | Read | Read |
| **Commission Settings (edit)** | Yes | No | No | No |
| **Revenue Reports** | Yes | Yes | No | Read |
| **Chat Monitoring** | Yes | No | Yes | No |
| **Send System Message** | Yes | No | Yes | No |
| **Dispute Resolution** | Yes | No | Yes | No |
| **Push Notifications (send)** | Yes | No | Yes | No |
| **Push Notifications (view)** | Yes | Yes | Yes | Yes |
| **Home Sliders (edit)** | Yes | No | No | No |
| **Ads Moderation** | Yes | No | Yes | No |
| **Ads Delete** | Yes | No | No | No |
| **Admin User Management** | Yes | No | No | No |
| **Audit Log** | Yes | Read | No | No |
| **Force Complete/Cancel/Refund** | Yes | Yes (refund only) | No | No |
| **Override Status** | Yes | No | No | No |

---

## 5. API Endpoints & Supabase Queries

All dashboard operations use the **Supabase service role key** to bypass RLS. The Next.js API routes act as a secure proxy.

### 5.1 User Management

| Action | Method | Implementation |
|--------|--------|----------------|
| List users | GET | `supabase.from('profiles').select('*').order('created_at', { ascending: false }).range(offset, offset + limit)` |
| Search users | GET | `.or('display_name.ilike.%term%,email.ilike.%term%,phone.ilike.%term%')` |
| Get user detail | GET | `supabase.from('profiles').select('*').eq('user_id', id).single()` + `supabase.auth.admin.getUserById(id)` for auth fields |
| Get user wallet | GET | Direct DB query: `SELECT * FROM wallet_transactions WHERE user_id = $1` or call `get_wallet_summary` with service role |
| Suspend user | PUT | `supabase.from('profiles').update({ is_suspended: true, suspended_at: now, suspended_reason: reason }).eq('user_id', id)` |
| Ban user | PUT | `supabase.auth.admin.updateUserById(id, { banned: true })` + profile update |
| Get user orders | GET | `supabase.from('orders').select('*, ads(title, type)').or('buyer_id.eq.{id},seller_id.eq.{id}')` |
| Get user damin orders | GET | `supabase.from('damin_orders').select('*').or('creator_id.eq.{id},payer_user_id.eq.{id},beneficiary_user_id.eq.{id}')` |

### 5.2 Regular Order Management

| Action | Method | Implementation |
|--------|--------|----------------|
| List orders | GET | `supabase.from('orders').select('*, ads(id, title, type), buyer:profiles!buyer_id(display_name, avatar_url), seller:profiles!seller_id(display_name, avatar_url)')` |
| Filter by status | GET | `.eq('status', status)` or `.in('status', [statuses])` |
| Get order detail | GET | Full select with `ads`, `receipts`, buyer/seller profiles |
| Approve bank transfer | POST | `supabase.rpc('approve_service_bank_transfer', { p_order_id: id })` |
| Reject bank transfer | POST | `supabase.rpc('reject_service_bank_transfer', { p_order_id: id, p_reason: reason })` |
| Update order status | PUT | `supabase.rpc('transition_service_order_status', { p_order_id: id, p_new_status: status })` |
| Force complete | POST | Direct update: `supabase.from('orders').update({ status: 'completed', completed_at: now, escrow_released_at: now })` + wallet credit |
| Issue refund | POST | `supabase.from('orders').update({ status: 'refunded', refunded_at: now })` + wallet debit/credit reversal |
| Get transfer receipt image | GET | `supabase.storage.from('damin-orders').createSignedUrl(orders.transfer_receipt_url)` |
| Get pending approvals count | GET | `supabase.from('orders').select('id', { count: 'exact' }).eq('status', 'awaiting_admin_transfer_approval')` |

### 5.3 Damin Order Management

| Action | Method | Implementation |
|--------|--------|----------------|
| List damin orders | GET | `supabase.from('damin_orders').select('*')` with profile joins |
| Get damin order detail | GET | `supabase.from('damin_orders').select('*').eq('id', id).single()` |
| Update damin status | PUT | `supabase.from('damin_orders').update({ status: newStatus }).eq('id', id)` |
| Get completion requests | GET | `supabase.from('damin_completion_requests').select('*').eq('order_id', id)` |
| Force complete damin | POST | `supabase.rpc('complete_damin_service', { p_order_id: id })` (or direct update with service role) |
| View dispute reason | GET | `damin_orders.dispute_reason` + `damin_orders.metadata.dispute_*` |

### 5.4 Financial Operations

| Action | Method | Implementation |
|--------|--------|----------------|
| List withdrawal requests | GET | `supabase.from('withdrawal_requests').select('*, profiles(display_name, phone)')` |
| Approve withdrawal | POST | `supabase.from('withdrawal_requests').update({ status: 'approved', approved_by: adminId, approved_at: now })` |
| Reject withdrawal | POST | `supabase.from('withdrawal_requests').update({ status: 'rejected', rejected_by: adminId, rejected_reason: reason })` + wallet credit reversal |
| Mark withdrawal processed | POST | `supabase.from('withdrawal_requests').update({ status: 'processed', processed_at: now })` |
| Get commission settings | GET | `supabase.rpc('get_commission_settings')` |
| Update commission settings | PUT | `supabase.from('commission_settings').update({ rate: newRate }).eq('service_type', type)` |
| Revenue report | GET | Aggregate query on completed orders with date filters |

### 5.5 Chat Operations

| Action | Method | Implementation |
|--------|--------|----------------|
| List conversations | GET | `supabase.from('conversations').select('*, conversation_members(user_id, profiles(display_name))')` |
| Get messages | GET | `supabase.from('messages').select('*').eq('conversation_id', id).order('created_at')` |
| Get attachment signed URL | GET | `supabase.storage.from('chat').createSignedUrl(path, 3600)` |
| Send system message | POST | `supabase.from('messages').insert({ conversation_id, sender_id: SYSTEM_USER_ID, content, attachments: [] })` |

### 5.6 Push Notifications

| Action | Method | Implementation |
|--------|--------|----------------|
| Get all push tokens | GET | `supabase.from('user_push_tokens').select('expo_push_token, user_id, platform')` |
| Get tokens for user | GET | `.eq('user_id', userId)` |
| Send push notification | POST | Batch call to `https://exp.host/--/api/v2/push/send` with Expo Push API |
| Get active token count | GET | `supabase.from('user_push_tokens').select('id', { count: 'exact' })` |

### 5.7 Content Management

| Action | Method | Implementation |
|--------|--------|----------------|
| List home sliders | GET | `supabase.from('home_sliders').select('*').order('sort_order')` |
| Create slider | POST | `supabase.from('home_sliders').insert({...})` |
| Update slider | PUT | `supabase.from('home_sliders').update({...}).eq('id', id)` |
| Delete slider | DELETE | `supabase.from('home_sliders').delete().eq('id', id)` |
| Reorder sliders | PUT | Batch update `sort_order` values |
| Upload slider image | POST | `supabase.storage.from('home-sliders').upload(path, file)` |

### 5.8 Ads Management

| Action | Method | Implementation |
|--------|--------|----------------|
| List ads | GET | `supabase.from('ads').select('*, ad_images(storage_path, sort_order), owner:profiles!owner_id(display_name)')` |
| Get ad detail | GET | `.eq('id', id).single()` |
| Hide ad | PUT | `supabase.from('ads').update({ metadata: { ...metadata, is_hidden: true } }).eq('id', id)` |
| Delete ad | DELETE | `supabase.from('ads').delete().eq('id', id)` (cascades to `ad_images`) |
| Get ad image | GET | `supabase.storage.from('ads').getPublicUrl(path)` |

### 5.9 Real-time Subscriptions

The dashboard should subscribe to real-time changes for critical queues:

```typescript
// Bank transfer approval queue - real-time
supabase
  .channel('admin-transfer-approvals')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
    filter: 'status=eq.awaiting_admin_transfer_approval'
  }, handleTransferApprovalChange)
  .subscribe();

// Withdrawal requests - real-time
supabase
  .channel('admin-withdrawals')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'withdrawal_requests'
  }, handleNewWithdrawal)
  .subscribe();

// New disputes - real-time
supabase
  .channel('admin-disputes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orders',
    filter: 'status=eq.disputed'
  }, handleNewDispute)
  .subscribe();
```

---

## 6. Tech Stack Recommendation

### 6.1 Core Framework

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **Next.js 15** (App Router) | Server components for initial data loading, API routes for mutations, excellent Vercel deployment |
| Language | **TypeScript** | Type safety for complex order state machines and role-based logic |
| Database Client | **@supabase/supabase-js** (service role) | Direct access to the same Supabase instance as the mobile app |
| Auth | **NextAuth.js v5** (Auth.js) | Separate admin auth with credentials provider (email/password from `admin_users` table) |

### 6.2 UI Components

| Component | Library | Rationale |
|-----------|---------|-----------|
| Design System | **shadcn/ui** | Headless, accessible, customizable. Perfect for admin dashboards |
| Data Tables | **TanStack Table v8** | Powerful sorting, filtering, pagination for all list views |
| Charts | **Recharts** or **Tremor** | Clean chart components built on Recharts with good defaults for dashboards |
| Forms | **React Hook Form** + **Zod** | Type-safe form validation for all admin actions |
| Icons | **Lucide React** | Already used by shadcn/ui, comprehensive icon set |
| Date Handling | **date-fns** | Lightweight, tree-shakeable date formatting |
| Toasts | **Sonner** | Already bundled with shadcn/ui |
| Image Viewer | **react-medium-image-zoom** | For viewing bank transfer receipt images with zoom |

### 6.3 State Management & Data Fetching

| Concern | Solution |
|---------|----------|
| Server-side data | Next.js Server Components (RSC) with async data fetching |
| Client-side mutations | Server Actions (Next.js) |
| Client-side caching | **TanStack Query v5** for real-time data and optimistic updates |
| Real-time | Supabase Realtime subscriptions (client-side) |
| Global state | **Zustand** (minimal -- only for UI state like sidebar collapse, current admin info) |

### 6.4 Project Structure

```
kafel-admin/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + header layout
│   │   ├── page.tsx                # Overview dashboard
│   │   ├── users/
│   │   │   ├── page.tsx            # User list
│   │   │   └── [id]/page.tsx       # User detail
│   │   ├── orders/
│   │   │   ├── regular/page.tsx    # Regular orders
│   │   │   ├── damin/page.tsx      # Damin orders
│   │   │   ├── transfer-approvals/page.tsx  # CRITICAL: Approval queue
│   │   │   └── [type]/[id]/page.tsx         # Order detail
│   │   ├── finance/
│   │   │   ├── wallets/page.tsx
│   │   │   ├── withdrawals/page.tsx
│   │   │   ├── commissions/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── reports/page.tsx
│   │   ├── chats/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── disputes/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── notifications/
│   │   │   ├── send/page.tsx
│   │   │   └── history/page.tsx
│   │   ├── content/
│   │   │   └── sliders/page.tsx
│   │   └── ads/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       └── [...] # API routes for mutations
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Breadcrumbs.tsx
│   ├── tables/
│   │   ├── OrdersTable.tsx
│   │   ├── UsersTable.tsx
│   │   └── columns/         # TanStack Table column definitions
│   ├── orders/
│   │   ├── StatusBadge.tsx
│   │   ├── StatusTimeline.tsx
│   │   ├── TransferApprovalCard.tsx
│   │   └── OrderActionPanel.tsx
│   └── charts/
│       ├── RevenueChart.tsx
│       └── OrdersChart.tsx
├── lib/
│   ├── supabase/
│   │   ├── admin-client.ts  # Service role client (server-only)
│   │   ├── types.ts         # Generated types from Supabase
│   │   └── queries/
│   │       ├── orders.ts
│   │       ├── damin-orders.ts
│   │       ├── users.ts
│   │       ├── wallets.ts
│   │       ├── chat.ts
│   │       └── notifications.ts
│   ├── auth/
│   │   ├── config.ts        # NextAuth configuration
│   │   └── rbac.ts          # Role-based permission checks
│   └── utils/
│       ├── formatters.ts    # Currency, date, phone formatters
│       └── constants.ts     # Status lists, color mappings
├── hooks/
│   ├── useRealtimeOrders.ts
│   ├── useRealtimeApprovals.ts
│   └── usePermissions.ts
├── middleware.ts             # Auth + role checks
├── next.config.ts
├── tailwind.config.ts
└── .env.local
```

---

## 7. Security Considerations

### 7.1 Service Role Key Management

The Supabase service role key grants full database access, bypassing all RLS policies. It must be handled with extreme care:

- **NEVER** expose the service role key to the client/browser. It must only be used in:
  - Next.js Server Components
  - Next.js API Routes / Server Actions
  - `middleware.ts`
- Store as `SUPABASE_SERVICE_ROLE_KEY` in environment variables
- Verify the key is not included in client bundles by checking the Next.js build output
- Rotate the key periodically (quarterly minimum)

```typescript
// lib/supabase/admin-client.ts (SERVER ONLY)
import { createClient } from '@supabase/supabase-js';

if (typeof window !== 'undefined') {
  throw new Error('Admin Supabase client must not be imported on the client side');
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Never NEXT_PUBLIC_
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

### 7.2 Authentication Security

- Admin accounts use email/password authentication stored in the separate `admin_users` table
- Passwords hashed with bcrypt (cost factor 12+)
- **Two-Factor Authentication (2FA):** Required for Super Admin and Finance Admin roles
  - TOTP-based (Google Authenticator, Authy compatible)
  - Enforced at login time via middleware
- Session timeout: 8 hours for active sessions, 30 minutes for idle
- Session stored in HTTP-only, secure, SameSite=Strict cookies

### 7.3 Audit Logging

Every admin mutation must be logged in `admin_audit_log`:

```typescript
async function logAdminAction(params: {
  adminId: string;
  action: string;       // 'approve_transfer', 'reject_transfer', 'ban_user', etc.
  entityType: string;   // 'order', 'damin_order', 'user', 'withdrawal', etc.
  entityId: string;
  details: Record<string, any>;
  ipAddress: string;
}) {
  await supabaseAdmin.from('admin_audit_log').insert({
    admin_id: params.adminId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    details: params.details,
    ip_address: params.ipAddress,
  });
}
```

**Log retention:** Minimum 2 years (regulatory compliance for financial transactions in KSA).

### 7.4 Access Control Enforcement

```typescript
// lib/auth/rbac.ts
type Role = 'super_admin' | 'finance_admin' | 'support_agent' | 'viewer';

const permissions: Record<string, Role[]> = {
  'orders.approve_transfer':  ['super_admin', 'finance_admin'],
  'orders.reject_transfer':   ['super_admin', 'finance_admin'],
  'orders.update_status':     ['super_admin', 'support_agent'],
  'orders.force_complete':    ['super_admin'],
  'orders.override_status':   ['super_admin'],
  'users.suspend':            ['super_admin'],
  'users.ban':                ['super_admin'],
  'withdrawals.approve':      ['super_admin', 'finance_admin'],
  'withdrawals.reject':       ['super_admin', 'finance_admin'],
  'commission.edit':          ['super_admin'],
  'notifications.send':       ['super_admin', 'support_agent'],
  'chat.send_system_message': ['super_admin', 'support_agent'],
  'ads.delete':               ['super_admin'],
  'ads.moderate':             ['super_admin', 'support_agent'],
  'sliders.edit':             ['super_admin'],
  'admin.manage_users':       ['super_admin'],
};

export function hasPermission(role: Role, action: string): boolean {
  return permissions[action]?.includes(role) ?? false;
}
```

Enforce at three levels:
1. **Middleware** -- Block route access based on role
2. **Server Action / API Route** -- Check permission before executing mutation
3. **UI** -- Hide/disable action buttons based on role (defense in depth, not primary control)

### 7.5 Additional Security Measures

- **Rate limiting** on API routes (especially login, bulk operations)
- **CORS** restricted to dashboard domain only
- **CSP headers** to prevent XSS
- **Input validation** with Zod schemas on all API inputs
- **SQL injection protection** -- Always use Supabase client parameterized queries, never raw SQL string concatenation
- **Image upload validation** -- Verify file type and size for transfer receipt uploads (max 10MB, image/* only)
- **IBAN validation** -- Server-side IBAN format validation before processing withdrawals

---

## 8. Deployment

### 8.1 Vercel Deployment

The dashboard is deployed as a standard Next.js application on Vercel.

**Environment Variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) | `eyJhbGciOi...` |
| `NEXTAUTH_SECRET` | NextAuth session encryption key | Random 32+ char string |
| `NEXTAUTH_URL` | Dashboard URL | `https://admin.kafel.app` |
| `EXPO_PUSH_ACCESS_TOKEN` | Expo push notification access token (optional but recommended) | `ExponentPushToken[...]` |

**Important:** `SUPABASE_SERVICE_ROLE_KEY` must NOT have the `NEXT_PUBLIC_` prefix. Vercel automatically excludes non-prefixed env vars from client bundles.

### 8.2 Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "regions": ["arn1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

**Region:** Deploy to `arn1` (Stockholm) or the region closest to your Supabase instance for minimal latency.

### 8.3 Domain Setup

- Production: `admin.kafel.app` (behind Vercel edge, HTTPS enforced)
- Staging: `admin-staging.kafel.app` (points to staging Supabase project)

### 8.4 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml (if using GitHub Actions alongside Vercel)
name: Dashboard CI
on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  # Vercel handles actual deployment via its GitHub integration
```

### 8.5 Database Migrations Required

Before the dashboard can operate, the following new tables/columns must be added to the Supabase database:

```sql
-- 1. Admin users table (separate from mobile users)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'finance_admin', 'support_agent', 'viewer')),
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX admin_audit_log_admin_id_idx ON admin_audit_log(admin_id);
CREATE INDEX admin_audit_log_entity_idx ON admin_audit_log(entity_type, entity_id);
CREATE INDEX admin_audit_log_created_at_idx ON admin_audit_log(created_at DESC);

-- 3. Add is_suspended column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- 4. Add admin notification tracking table
CREATE TABLE IF NOT EXISTS admin_notifications_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'specific', 'filter')),
  target_user_ids UUID[],
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  body_en TEXT NOT NULL,
  body_ar TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  tokens_sent INTEGER NOT NULL DEFAULT 0,
  tokens_delivered INTEGER NOT NULL DEFAULT 0,
  tokens_failed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Seed initial super admin (update password hash before running)
-- Password should be hashed with bcrypt before insertion
-- INSERT INTO admin_users (email, password_hash, role, display_name)
-- VALUES ('admin@kafel.app', '$2b$12$...', 'super_admin', 'Super Admin');
```

### 8.6 Monitoring & Alerts

Set up the following alerts (via Vercel, Supabase, or an external tool like Sentry/Datadog):

| Alert | Condition | Channel |
|-------|-----------|---------|
| Transfer approval queue growing | Pending approvals > 10 or oldest > 30 minutes | Slack + SMS |
| Withdrawal queue growing | Pending withdrawals > 20 or oldest > 24 hours | Slack |
| Dashboard errors | 5xx error rate > 1% | Sentry + Slack |
| Failed push notifications | Delivery failure rate > 10% | Slack |
| Dispute filed | Any new dispute | Slack |
| Large transaction | Order amount > 50,000 SAR | Slack |

---

## Appendix A: Order State Machine Reference

### Regular Orders (Tanazul / Taqib)

```
                                    +-----------+
                                    | cancelled |
                                    +-----------+
                                         ^
                                         | (admin/user)
                                         |
+-----------------+    +-------------------+    +-----------------------------------+
| awaiting_payment| -> | payment_submitted | -> | awaiting_admin_transfer_approval  |
+-----------------+    +-------------------+    +-----------------------------------+
       |                                              |                    |
       | (card/apple pay)                             | APPROVE            | REJECT
       v                                              v                    v
+------------------+                          +------------------+  (back to awaiting_payment)
| payment_verified | <------------------------| payment_verified |
+------------------+                          +------------------+
       |
       v
+-------------+    +----------------------+    +-----------+
| in_progress | -> | completion_requested | -> | completed |
+-------------+    +----------------------+    +-----------+
       |                    |                        |
       v                    v                        v
  +---------+          +---------+             +----------+
  | disputed|          | disputed|             | refunded |
  +---------+          +---------+             +----------+
```

### Damin Orders

```
+---------+    +-----------------------+    +----------------+
| created | -> | pending_confirmations | -> | both_confirmed |
+---------+    +-----------------------+    +----------------+
                                                    |
                                                    v
                                            +----------------+
                                            | escrow_deposit |
                                            +----------------+
                                                    |
                                                    v
                                          +----------------------+
                                          | awaiting_completion  |
                                          +----------------------+
                                                    |
                                    +---------------+---------------+
                                    v               v               v
                              +-----------+   +---------+    +-----------+
                              | completed |   | disputed|    | cancelled |
                              +-----------+   +---------+    +-----------+
```

---

## Appendix B: Storage Buckets Reference

| Bucket | Visibility | Content |
|--------|-----------|---------|
| `ads` | Public | Ad listing images |
| `chat` | Private (signed URLs) | Chat attachments, receipt PDFs |
| `damin-orders` | Public | Bank transfer receipt images for orders |
| `avatars` | Public | User profile avatars |
| `home-sliders` | Public (new) | Background images for home sliders |

---

## Appendix C: Supabase RPC Functions Reference

| Function | Purpose | Used By |
|----------|---------|---------|
| `approve_service_bank_transfer(p_order_id)` | Admin approves bank transfer -> `payment_verified` | Transfer Approval Queue |
| `reject_service_bank_transfer(p_order_id, p_reason)` | Admin rejects bank transfer -> `awaiting_payment` | Transfer Approval Queue |
| `transition_service_order_status(p_order_id, p_new_status)` | Generic order status transition with validation | Order Management |
| `confirm_order_completion(p_order_id)` | Dual-party completion confirmation | Order Detail |
| `confirm_service_received(p_order_id)` | Buyer confirms service receipt -> `completed` | Order Detail |
| `submit_service_bank_transfer(p_order_id, ...)` | Buyer submits bank transfer proof | Mobile App (reference only) |
| `create_order_notification(...)` | Create order-related notification | Internal (post-action) |
| `find_pending_damin_orders_by_phone(phone)` | Find damin orders by phone | User Detail |
| `link_user_to_damin_order(order_id, phone)` | Link user to damin order | Mobile App (reference only) |
| `confirm_damin_order_participation(order_id)` | Party confirms participation | Mobile App (reference only) |
| `reject_damin_order_participation(order_id, reason)` | Party rejects participation | Mobile App (reference only) |
| `confirm_damin_service_completion(order_id)` | Service completion confirmation | Damin Order Detail |
| `submit_damin_payment(order_id)` | Payment submission | Mobile App (reference only) |
| `confirm_damin_card_payment(order_id)` | Auto-confirm card payment | Mobile App (reference only) |
| `complete_damin_service(p_order_id)` | Complete service and release funds | Damin Order Detail |
| `submit_damin_dispute(p_order_id, p_reason)` | File a dispute | Mobile App / Dispute Resolution |
| `notify_damin_order_created(...)` | Send notifications on order creation | Internal (reference only) |
| `get_wallet_summary()` | Get user wallet summary | User Detail / Finance |
| `get_wallet_transactions(p_limit, p_offset)` | Get user wallet transactions | User Detail / Finance |
| `submit_withdrawal_request(...)` | Submit withdrawal request | Mobile App (reference only) |
| `get_commission_settings()` | Fetch active commission settings | Commission Settings |
| `create_dm_conversation(other_user_id)` | Create DM conversation | Chat (admin system messages) |
| `create_ad_dm_conversation(other_user_id, ad_id)` | Create ad-specific DM | Reference only |

---

*End of Specification*
