<!-- Auth -->
Login page
Signup page (includes business/tenant creation in same flow)

<!-- Core app -->

Dashboard (top summary cards, overdue list, recent activity — sections 1–3 we discussed)
Debtor List page (all debtors, search/filter by active/closed/overdue)
Add Debtor page (or modal — name, phone, opening balance, due date)
Debtor Detail page (their info, current balance, full ledger history, buttons: add charge / add payment / send reminder / close debtor)
Add Charge page/modal
Add Payment page/modal

<!-- Settings / account -->

Business Profile / Settings page (edit business name, currency, owner info)
(maybe) Empty/onboarding state — first-time screen when a new owner has zero debtors yet, guiding them to add their first one

<!-- Dashboard-Page -->

<!-- Here's the complete design for the Dashboard Page — data, layout sections, and edge cases for each. -->



### Top Summary Cards

**Total Outstanding**
Sum of *(charges − payments)* across all active debtors.
**Edge case:** If there are zero debtors yet → show `Rs 0`, not blank or error.

**Collected This Month**
Sum of payments where `transactionDate` falls in the current calendar month.
**Edge case:** Month boundary should use the owner’s local timezone, not server UTC, or the 1st of the month can be calculated wrong for them.

**Active Debtors**
Count of debtors with `status = active`.
**Edge case:** A debtor who owes `Rs 0` but is not closed should still count as active, because they are settled up, not gone.

**Overdue Debtors**
Count of active debtors past their due date with balance `> 0`.
**Edge case:** A debtor with a due date but balance already `0` is **not overdue** and should be excluded.


Edge case across all 4 cards: brand-new owner, zero debtors → all four should show 0, and this triggers the Empty State page instead of a dashboard full of zeros (better UX — a wall of zeroes looks broken, an onboarding message doesn't).

<!-- Section 2: Overdue List (most important section) -->

Each row shows:

Debtor name + phone
Amount owed
Due date + "X days overdue"
Last payment date (or "never paid" if none)

Sorted by most overdue first.

Edge cases:

Debtor has no due date set at all → they can never appear here, regardless of balance (no due date = can't be "overdue," just "outstanding")
Debtor overdue by 0 days (due today) → decide now: is "due today" overdue or not yet? I'd say not yet — keep a separate "due today" tag, don't lump into overdue.
List with 50+ overdue debtors → paginate or cap at showing top 10 with a "view all" link, don't dump everything on the dashboard

<!-- Section 3: Recent Activity Feed -->

Last 10–20 ledger entries across all debtors, newest first. Each line:

Debtor name, action (charge/payment), amount, relative time ("2 hours ago")

Edge cases:

Zero transactions yet → show "No activity yet" not a blank space
Backdated entries (owner enters last week's transaction today) — sort by createdAt (when entered) here, not transactionDate (when it happened), so the feed reflects real-time activity, not a scrambled historical order

<!-- Section 4: Upcoming Due Dates (next 7 days) -->

Debtors with due date in next 7 days, not yet overdue.

Edge case: debtor due today — this is where they show up (ties into the "due today ≠ overdue" decision above), so nothing falls through the cracks between sections 2 and 4.

# Company Model (Tenant)

The `Company` model represents a business using Audar Hub. Every debtor, loan, payment, and user belongs to a single company, ensuring complete tenant isolation.

---

## Purpose

* Represents a business (shop, committee, lender, etc.)
* Owns all business data
* Provides multi-tenant isolation
* Stores company-wide settings

---

## Fields

### `name`

* **Type:** String
* **Required:** ✅ Yes
* **Description:** Business name (e.g., *Al-Falah Store*)
* **Validation:**

  * Minimum 2 characters
  * Trim whitespace
  * Does not need to be unique

---

### `type`

* **Type:** Enum (String)
* **Required:** ✅ Yes
* **Values:**

  * `shop`
  * `committee`
  * `lender`
  * `other`
* **Purpose:** Determines business type and future UI terminology.

---

### `ownerId`

* **Type:** ObjectId
* **Reference:** User
* **Required:** ✅ Yes
* **Description:** User who owns this company.
* **Validation:**

  * Must reference an existing user.

---

### `currency`

* **Type:** String
* **Required:** ✅ Yes
* **Default:** `PKR`
* **Purpose:** Company currency. Stored as a field instead of hardcoding.

---

### `phone`

* **Type:** String
* **Required:** ❌ No
* **Purpose:** Business contact number.
* **Validation:**

  * Trim whitespace
  * Reasonable length
  * Valid phone number format

---

### `status`

* **Type:** Enum (String)
* **Required:** ✅ Yes
* **Default:** `active`
* **Values:**

  * `active`
  * `suspended`
  * `deleted` *(soft delete)*

---

### `createdAt`

* Automatically generated.

### `updatedAt`

* Automatically generated.

Use Mongoose timestamps instead of manually creating these fields.

---

## Relationships

### One Company → Many Users

* Owner
* Staff members

### One Company → Many Debtors

### One Company → Many Loans

### One Company → Many Payments

### One Company → Many Activity Logs

---

## Validations

* Company name is required.
* Company name must contain at least 2 characters.
* Company type must match one of the allowed enum values.
* Owner must exist before creating a company.
* Currency is required.
* Phone number (if provided) must be valid.
* Status must match one of the allowed enum values.

---

## Business Rules

* A company can have **multiple staff members**.
* Every user belongs to exactly one company.
* All debtors, loans, payments, and activity logs belong to one company.
* Users can only access data belonging to their own company.
* Company owners cannot be permanently deleted in V1 to avoid orphaning business data.
* Company status controls whether the business can access the system.

---

## Future Enhancements

* Business logo
* Business address
* Timezone
* Language
* WhatsApp settings
* Subscription plan
* Billing information
* Custom branding

                          <!-- USER -->

 # User Model (Owner / Staff)

The `User` model represents every authenticated person who can log in to Audar Hub. Every user belongs to exactly one company and is responsible for managing debtors, loans, and payments according to their role.

---

## Purpose

- Represents an authenticated user.
- Belongs to exactly one company.
- Controls authentication and authorization.
- Tracks who performs business actions.

---

## Fields

### `companyId`
- **Type:** ObjectId
- **Reference:** Company
- **Required:** ✅ Yes
- **Description:** Identifies which company the user belongs to.

---

### `name`
- **Type:** String
- **Required:** ✅ Yes
- **Description:** Full name of the user.
- **Validation:**
  - Minimum 2 characters
  - Trim whitespace

---

### `phone`
- **Type:** String
- **Required:** ✅ Yes
- **Description:** Primary login identifier.
- **Validation:**
  - Trim whitespace
  - Optional leading `+`
  - Digits only
  - Length between **10–15** digits
  - Must be unique across the entire system
  - Regex:

```regex
^\+?[0-9]{10,15}$
```

---

### `email`
- **Type:** String
- **Required:** ❌ No
- **Description:** Optional contact email.
- **Validation (if provided):**
  - Trim whitespace
  - Convert to lowercase
  - Must be a valid email address

---

### `passwordHash`
- **Type:** String
- **Required:** ✅ Yes
- **Description:** Stores the bcrypt hash only.
- **Important:** Raw passwords are **never** stored in the database.

---

### `role`
- **Type:** Enum (String)
- **Required:** ✅ Yes
- **Default:** `owner`

**Allowed Values**

- `owner`
- `staff`

---

### `status`
- **Type:** Enum (String)
- **Required:** ✅ Yes
- **Default:** `active`

**Allowed Values**

- `active`
- `disabled`

---

### `lastLoginAt`
- **Type:** Date
- **Required:** ❌ No
- **Purpose:** Stores the user's most recent login time.

---

### `createdAt`
Automatically generated.

### `updatedAt`
Automatically generated.

Use Mongoose `timestamps: true`.

---

# Relationships

### One User → Belongs to One Company

Every user must belong to exactly one company.

---

### One Company → Many Users

A company contains:

- One Owner
- Zero or More Staff Members

---

### One User → Many Activity Logs

Every important action performed by a user can be recorded for auditing.

Examples:

- Debtor Created
- Loan Added
- Payment Recorded
- Settings Updated

---

# Model Validations

- Company must exist.
- Name is required.
- Name must contain at least 2 characters.
- Phone number is required.
- Phone number must follow the approved format.
- Phone number must be unique.
- Email is optional but must be valid if provided.
- Password hash is required.
- Role must match one of the allowed enum values.
- Status must match one of the allowed enum values.

---

# Password Responsibility

The User model never knows about raw passwords.

The model stores only:

```text
passwordHash
```

Password validation belongs inside the Authentication Service / Signup Controller.

Example responsibilities:

- Validate password length
- Confirm password
- Password strength checks
- Hash password using bcrypt
- Store only the resulting hash

This keeps authentication logic separate from the database model.

---

# Business Rules

- Every user belongs to exactly one company.
- Every company must always have one active owner.
- A company may have multiple staff members.
- Users cannot access data belonging to another company.
- Staff accounts can be disabled instead of deleted.
- Historical records should always preserve the user who created them.

---

# Edge Cases

### Signup Transaction

Creating a Company and its Owner should happen inside a single transaction.

If one operation fails:

- Company should not exist without an owner.
- Owner should not exist without a company.

---

### Phone Number Reuse

For V1:

- One phone number = One account = One company.

Multi-company ownership can be introduced in a future version.

---

### Owner Account

Owner accounts cannot be permanently deleted.

Ownership should be transferred to another user before disabling or removing the current owner.

---

# Future Enhancements

- Profile Picture
- Two-Factor Authentication (2FA)
- Email Verification
- Phone Verification (OTP)
- Password Reset
- Last Active Timestamp
- Login History
- Device Management
- Permission-Based Roles                         


                      <!-- DEPTOR MODEL -->


# Debtor Model

The `Debtor` model represents a customer who owes money to a company. A debtor belongs to exactly one company and can have multiple loans and payments over time.

---

## Purpose

- Represents a customer/debtor.
- Belongs to one company.
- Stores customer information.
- Maintains summary information used throughout the application.

---

## Fields

### `companyId`
- **Type:** ObjectId
- **Reference:** Company
- **Required:** ✅ Yes
- **Description:** Identifies which company owns this debtor.

---

### `name`
- **Type:** String
- **Required:** ✅ Yes
- **Description:** Full name of the debtor.
- **Validation:**
  - Minimum 2 characters
  - Trim whitespace

---

### `phone`
- **Type:** String
- **Required:** ❌ No
- **Description:** Debtor's contact number.
- **Validation (if provided):**
  - Trim whitespace
  - Optional leading `+`
  - Digits only
  - Length between 10–15 digits
  - Regex:

```regex
^\+?[0-9]{10,15}$
```

- **Note:** Phone numbers are **not unique**. Family members may legitimately share the same number.

---

### `openingBalance`
- **Type:** Number
- **Required:** ✅ Yes
- **Default:** `0`
- **Description:** Outstanding balance before the debtor was added to Audar Hub.
- **Validation:**
  - Must be a valid number
  - Can be positive, zero, or negative

---

### `status`
- **Type:** Enum (String)
- **Required:** ✅ Yes
- **Default:** `active`

**Allowed Values**

- `active`
- `inactive`
- `closed`

---

### `lastPaymentDate`
- **Type:** Date
- **Required:** ❌ No
- **Description:** Date of the debtor's most recent payment.
- **Note:** Updated automatically whenever a payment is recorded.

---

### `notes`
- **Type:** String
- **Required:** ❌ No
- **Description:** Internal notes about the debtor.

Example:

> Pays late every Ramadan.

---

### `createdAt`
Automatically generated.

### `updatedAt`
Automatically generated.

Use Mongoose `timestamps: true`.

---

## Not Stored in This Model

### `currentBalance`

Current balance is **not stored**.

It is calculated from:

- Opening Balance
- Loans
- Payments

This avoids duplicated data and keeps the balance accurate.

---

### `dueDate`

Due dates belong to individual **Loan** records, not the debtor.

A debtor may have multiple loans with different due dates.

---

## Relationships

### One Debtor → Belongs to One Company

Every debtor belongs to exactly one company.

---

### One Debtor → Many Loans

A debtor can receive multiple loans over time.

---

### One Debtor → Many Payments

A debtor can make multiple payments.

---

## Model Validations

- Company must exist.
- Name is required.
- Name must contain at least 2 characters.
- Phone number is optional but must be valid if provided.
- Opening balance must be a valid number.
- Status must match one of the allowed enum values.

---

## Business Rules

- Debtors are isolated by company.
- A debtor may exist without a phone number.
- A debtor may have multiple loans.
- A debtor may have multiple payments.
- `lastPaymentDate` updates automatically whenever a payment is recorded.
- Closing a debtor does not delete historical loans or payments.

---

## Edge Cases

### Duplicate Debtors

Do not block duplicates automatically.

If another debtor with the same name and phone exists:

- Show a warning.
- Allow the owner to continue.

---

### Missing Phone Number

Debtors without a phone number can still be created.

Features like WhatsApp reminders should simply be unavailable until a phone number is added.

---

### Closing a Debtor with Outstanding Balance

Warn the owner before closing.

Example:

> This debtor still owes PKR 2,000. Are you sure you want to close this account?

Allow the owner to continue if they confirm.

---

## Future Enhancements

- Profile photo
- Address
- CNIC / National ID
- Tags (VIP, Trusted Customer, etc.)
- Credit Limit
- Preferred Payment Method
- Archived Status

                   <!-- Charge -->


# Charge Model

The `Charge` model represents money that a debtor owes to a company. Every charge increases the debtor's outstanding balance. It is the "money going out" side of the ledger and forms one half of the accounting system, while payments reduce the balance.

---

## Purpose

- Represents a credit (udhaar) given to a debtor.
- Increases the debtor's outstanding balance.
- Supports optional repayment deadlines.
- Maintains an append-only financial history.

---

## Fields

### `companyId`
- **Type:** ObjectId
- **Reference:** Company
- **Required:** ✅ Yes
- **Description:** Identifies which company owns this charge.

---

### `debtorId`
- **Type:** ObjectId
- **Reference:** Debtor
- **Required:** ✅ Yes
- **Description:** Identifies the debtor who owes this amount.

---

### `amount`
- **Type:** Number
- **Required:** ✅ Yes
- **Description:** Amount added to the debtor's balance.
- **Validation:**
  - Must be greater than 0.
  - Must be a valid numeric value.
- **Editable After Creation:** ❌ No

---

### `note`
- **Type:** String
- **Required:** ❌ No
- **Description:** Optional description of the charge.

Examples:

- Flour Bag
- Grocery Purchase
- Cash Given
- Mobile Recharge

- **Editable After Creation:** ✅ Yes

---

### `dueDate`
- **Type:** Date
- **Required:** ❌ No
- **Description:** Optional reminder date indicating when payment is expected.
- **Validation:**
  - Cannot be earlier than the transaction date.
- **Editable After Creation:** ✅ Yes

---

### `transactionDate`
- **Type:** Date
- **Required:** ✅ Yes
- **Default:** Current Date
- **Description:** Date when the charge actually occurred.
- **Validation:**
  - Cannot be in the future.
  - Backdating is allowed.
- **Editable After Creation:** ❌ No

---

### `recordedBy`
- **Type:** ObjectId
- **Reference:** User
- **Required:** ✅ Yes
- **Description:** User who recorded the charge.
- **Editable After Creation:** ❌ No

---

### `status`
- **Type:** Enum (String)
- **Required:** ✅ Yes
- **Default:** `active`

**Allowed Values**

- `active`
- `reversed`

**Purpose**

Supports append-only accounting.

Financial records are never deleted or modified. Incorrect entries are reversed instead.

---

### `reversalOf`
- **Type:** ObjectId
- **Reference:** Charge
- **Required:** ❌ No
- **Description:** References the original charge when this entry is created as a reversal.

---

### `createdAt`
Automatically generated.

### `updatedAt`
Automatically generated.

Use Mongoose:

```js
timestamps: true
```

---

# Relationships

### One Charge → Belongs to One Company

Every charge belongs to exactly one company.

---

### One Charge → Belongs to One Debtor

Every charge belongs to exactly one debtor.

---

### One Charge → Recorded By One User

Every charge records which user created it.

---

### One Charge → May Reference Another Charge

Used only for financial reversals.

---

# Model Validations

- Company must exist.
- Debtor must exist.
- Debtor must belong to the same company.
- Recorded user must exist.
- Recorded user must be active.
- Amount must be greater than 0.
- Amount must be numeric.
- Transaction date cannot be in the future.
- Due date (if provided) cannot be earlier than the transaction date.

---

# Field Edit Rules

| Field | Editable After Creation |
|--------|-------------------------|
| amount | ❌ No |
| debtorId | ❌ No |
| transactionDate | ❌ No |
| recordedBy | ❌ No |
| note | ✅ Yes |
| dueDate | ✅ Yes |

---

# Business Rules

- Every charge increases the debtor's outstanding balance.
- Financial records should never be deleted.
- Incorrect financial entries must be corrected using a reversal entry.
- Notes and due dates may be updated without affecting financial history.
- Financial amounts remain immutable after creation.

---

# Edge Cases

### Invalid Debtor

Reject the request if the debtor does not exist.

---

### Cross-Company Access

Reject the request if the debtor belongs to another company.

---

### Disabled User

Disabled users cannot record new charges.

---

### Future Transaction Date

Reject any transaction dated in the future.

---

### Invalid Due Date

Reject if the due date is earlier than the transaction date.

---

### Incorrect Financial Entry

Never edit the amount.

Create a reversal entry that references the original charge.

---

# Future Enhancements

- Attach invoice or receipt
- Product/category tags
- Photo attachments
- Bulk charge import
- Recurring charges
- Reminder scheduling


                          <!-- Payment -->


{
  # Payment Model

The `Payment` model represents money received from a debtor. Every payment decreases the debtor's outstanding balance and forms the "money coming in" side of the ledger.

---

## Purpose

- Represents money received from a debtor.
- Decreases the debtor's outstanding balance.
- Maintains an append-only financial history.
- Records who received the payment and when.

---

## Fields

### `companyId`

- **Type:** ObjectId
- **Reference:** Company
- **Required:** ✅ Yes
- **Description:** Identifies which company owns this payment.

---

### `debtorId`

- **Type:** ObjectId
- **Reference:** Debtor
- **Required:** ✅ Yes
- **Description:** Identifies the debtor who made the payment.

---

### `amount`

- **Type:** Number
- **Required:** ✅ Yes
- **Description:** Amount received from the debtor.
- **Validation:**
  - Must be greater than 0.
  - Must be a valid numeric value.
- **Editable After Creation:** ❌ No

---

### `note`

- **Type:** String
- **Required:** ❌ No
- **Description:** Optional notes describing the payment.

Examples:

- Partial Payment
- Paid in Full
- Advance Payment

- **Editable After Creation:** ✅ Yes

---

### `transactionDate`

- **Type:** Date
- **Required:** ✅ Yes
- **Default:** Current Date
- **Description:** Date the payment was actually received.
- **Validation:**
  - Cannot be in the future.
  - Backdating is allowed.
- **Editable After Creation:** ❌ No

---

### `recordedBy`

- **Type:** ObjectId
- **Reference:** User
- **Required:** ✅ Yes
- **Description:** User who recorded the payment.
- **Editable After Creation:** ❌ No

---

### `status`

- **Type:** Enum (String)
- **Required:** ✅ Yes
- **Default:** `active`

**Allowed Values**

- `active`
- `reversed`

**Purpose**

Supports append-only accounting.

Financial records are never deleted or modified. Incorrect payments are corrected by creating reversal entries.

---

### `reversalOf`

- **Type:** ObjectId
- **Reference:** Payment
- **Required:** ❌ No
- **Description:** References the original payment when this payment is created as a reversal.

---

### `createdAt`

Automatically generated.

---

### `updatedAt`

Automatically generated.

Use Mongoose:

```js
timestamps: true
```

---

# Relationships

### One Payment → Belongs to One Company

Every payment belongs to exactly one company.

---

### One Payment → Belongs to One Debtor

Every payment belongs to exactly one debtor.

---

### One Payment → Recorded By One User

Every payment stores which user recorded it.

---

### One Payment → May Reference Another Payment

Used only when reversing incorrect payments.

---

# Model Validations

- Company must exist.
- Debtor must exist.
- Debtor must belong to the same company.
- Recorded user must exist.
- Recorded user must be active.
- Amount must be greater than 0.
- Amount must be a valid numeric value.
- Transaction date cannot be in the future.

---

# Immutable Fields

The following fields cannot be modified after a payment has been created:

- amount
- debtorId
- transactionDate
- recordedBy

The following field may be edited:

- note

---

# Business Rules

- Every payment decreases the debtor's outstanding balance.
- Financial records must never be deleted.
- Incorrect payments must be corrected using reversal entries.
- Notes may be edited without affecting financial history.
- Payment amounts remain immutable after creation.
- Overpayments are allowed. A negative balance means the debtor has advance credit or the company owes money back to the debtor.

---

# Service Layer Responsibilities

The following logic belongs in the service layer (controller/service), not in the database model.

### Update `lastPaymentDate`

Whenever an active payment is successfully created:

- Update the debtor's `lastPaymentDate` if this payment is the most recent payment.

A backdated payment must **not** overwrite a newer `lastPaymentDate`.

---

### Reverse Payment

When reversing the latest payment:

- Recalculate the debtor's `lastPaymentDate`.
- Set it to the most recent remaining active payment.
- If no active payments remain, set it to `null`.

---

# Edge Cases

### Invalid Debtor

Reject the request if the debtor does not exist.

---

### Cross-Company Access

Reject the request if the debtor belongs to another company.

---

### Disabled User

Disabled users cannot record payments.

---

### Future Transaction Date

Reject any payment dated in the future.

---

### Overpayment

Allow payments greater than the debtor's current outstanding balance.

A negative balance represents advance credit.

---

### Incorrect Payment

Never edit the payment amount.

Create a reversal entry instead.

---

# Future Enhancements

- Payment Methods (Cash, Bank Transfer, Easypaisa, JazzCash)
- Receipt Number
- Receipt Image Upload
- Automatic WhatsApp Receipt
- Linked Invoice Support
- Bulk Payment Import
}                          