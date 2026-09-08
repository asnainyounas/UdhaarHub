Authentication Design

Access Token
- JWT
- Expiry: 15 minutes

Refresh Token
- Expiry: 7 days

Login Identifier
- Phone Number

Password
- bcrypt hashing

Signup
- Automatically log user in

Logout
- Remove refresh token

Protected Routes
- JWT Middleware

Token Payload
- userId
- companyId
- role

Authorization Header
Bearer <token>


                                   <!-- JWT STRATEGY -->


# JWT Strategy (V1)

## 1. JWT Payload

The JWT should contain only the minimum information required to identify the authenticated user and enforce authorization.

### Payload

```javascript
{
  userId: user._id,
  companyId: user.companyId,
  role: user.role
}
```

### Purpose

- **userId** → Identifies the authenticated user.
- **companyId** → Used for tenant isolation. Every protected database query is filtered using this value.
- **role** → Used for authorization (e.g. owner vs staff permissions).

### Never Store in JWT

The following information should never be included because JWTs are signed, not encrypted.

- Password Hash
- Phone Number
- Email
- User Name
- Any sensitive business data

---

# 2. JWT Secret

The JWT is signed using a secret key.

### Rules

- Store the secret in the `.env` file.
- Never hardcode the secret.
- Never commit it to GitHub.
- The secret should be long, random, and difficult to guess.

Example:

```
JWT_SECRET=your_long_random_secret_key
```

---

# 3. Token Expiry

For V1, the application will use a single JWT.

### Decision

- Token Expiry: **7 Days**
- Refresh Tokens: **Not implemented in V1**

### Reason

A 7-day token provides a good balance between security and user experience.

Shopkeepers should remain logged in without having to sign in every day, while keeping the token lifetime reasonably limited if it is ever compromised.

---

# 4. Token Storage

The frontend will store the JWT in **localStorage**.

The token will be sent with every protected request using the Authorization header.

Example:

```
Authorization: Bearer <JWT_TOKEN>
```

### Reason

- Simple to implement
- Standard approach for MERN applications
- Works well with separate React frontend and Express backend

---

# 5. Authentication Middleware

Every protected route must pass through the authentication middleware.

### Flow

```
Client Request
        │
        ▼
Read Authorization Header
        │
        ▼
Verify JWT Signature
        │
        ▼
Decode JWT Payload
        │
        ▼
Attach User Data to req.user
        │
        ▼
Continue to Controller
```

---

# 6. Middleware Responsibilities

The middleware must:

- Read the JWT from the Authorization header.
- Verify the token using `JWT_SECRET`.
- Decode the payload.
- Attach the following object to `req.user`:

```javascript
{
  userId,
  companyId,
  role
}
```

- Call `next()` if authentication succeeds.

---

# 7. Authentication Failure Cases

The middleware must return **401 Unauthorized** when:

- No Authorization header is provided.
- JWT is malformed.
- JWT signature is invalid.
- JWT has expired.
- User no longer exists.
- User status is `disabled`.

---

# Final Decisions (V1)

- JWT Authentication
- Phone Number as Login Identifier
- Payload: `userId`, `companyId`, `role`
- Token Expiry: **7 Days**
- No Refresh Tokens
- Store Token in **localStorage**
- Send Token using `Authorization: Bearer <token>`
- Protect every private route using Authentication Middleware                                   



                                  <!-- SIGN UP FLOW -->


# Signup Flow (V1)

## Step 1: Client Sends Signup Request

**Endpoint**

```
POST /api/auth/signup
```

**Request Body**

```javascript
{
  name: "Ali Raza",
  phone: "+923001234567",
  password: "plaintext-password",
  businessName: "Al-Falah Store",
  companyType: "shop"
}
```

---

## Step 2: Validate Input

Validate all required fields before accessing the database.

### Validation Rules

- Name is required (minimum 2 characters)
- Phone number is required and must match the phone format
- Password is required (minimum 6 characters)
- Business name is required (minimum 2 characters)
- Company type must be one of:
  - shop
  - committee
  - lender
  - other

If validation fails:

- Return **400 Bad Request**
- Return clear field-specific error messages

---

## Step 3: Check Existing User

Search for an existing user with the same phone number.

```javascript
User.findOne({ phone })
```

If found:

- Return **409 Conflict**
- Message:

```
This phone number is already registered.
```

---

## Step 4: Hash Password

- Hash the password using **bcrypt**.
- Store only `passwordHash`.
- Never store or return the raw password.

---

## Step 5: Create Company & User

Create both documents inside a **MongoDB Transaction**.

Flow:

```
Start Transaction

↓

Create Company

↓

Create User

↓

Update Company.ownerId

↓

Commit Transaction
```

If any step fails:

```
Abort Transaction

↓

Return Error
```

This guarantees that the database never contains a User without a Company or a Company without an Owner.

---

## Step 6: Generate JWT

Generate a JWT with the payload:

```javascript
{
  userId,
  companyId,
  role
}
```

Sign using:

- JWT_SECRET

Expiry:

- 7 Days

---

## Step 7: Update lastLoginAt

After successful signup:

```javascript
lastLoginAt = new Date()
```

---

## Step 8: Return Response

```javascript
{
  success: true,
  token: "<jwt>",

  user: {
    id,
    name,
    phone,
    role
  },

  company: {
    id,
    name,
    type,
    currency
  }
}
```

Never return:

- password
- passwordHash

---

# Error Handling

Return appropriate errors for:

- Missing required fields
- Invalid phone number
- Weak password
- Duplicate phone number
- Database errors
- Transaction failure

---

# Final Decisions (V1)

- Validate input before database queries.
- Phone number must be unique.
- Password is hashed using bcrypt.
- Company and User are created inside one transaction.
- Automatically log the user in after signup.
- Generate JWT after successful signup.
- Update `lastLoginAt`.
- Return JWT, User, and Company information.
- Never expose password or passwordHash.