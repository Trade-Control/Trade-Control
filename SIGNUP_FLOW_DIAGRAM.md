# Signup Flow Comparison

## Old Flow (Caused Redirect Loop)

```mermaid
sequenceDiagram
    participant User
    participant GetStarted
    participant Subscribe
    participant Stripe
    participant Success
    participant Login
    participant Middleware
    
    User->>GetStarted: Select tier
    GetStarted->>Subscribe: /subscribe?tier=X
    User->>Subscribe: Fill form & signup
    Note over Subscribe: Creates user account
    Subscribe->>Stripe: Redirect to checkout
    Stripe->>Success: Payment complete
    Note over Success: Creates organization
    Success->>Login: Redirect for email verification
    User->>Login: Verify email & login
    Login->>Middleware: Check organization
    Note over Middleware: Can't find organization_id
    Middleware->>Subscribe: Redirect (LOOP!)
    Note over User: User stuck in loop
```

## New Flow (Fixed)

```mermaid
sequenceDiagram
    participant User
    participant GetStarted
    participant Signup
    participant Email
    participant Login
    participant Subscribe
    participant Stripe
    participant Success
    participant Onboarding
    participant Dashboard
    
    User->>GetStarted: Select tier
    GetStarted->>Signup: /signup?tier=X
    Note over Signup: Tier stored in metadata
    User->>Signup: Create account
    Signup->>User: Show verification notice
    Signup->>Email: Send verification email
    User->>Email: Click link
    Email->>Login: Redirect after verification
    User->>Login: Enter credentials
    Note over Login: Check org status
    Login->>Subscribe: /subscribe?tier=X
    Note over Subscribe: Requires authentication
    Note over Subscribe: Pre-fills tier from metadata
    User->>Subscribe: Enter business name
    Subscribe->>Stripe: Redirect to checkout
    Stripe->>Success: Payment complete
    Note over Success: User is authenticated
    Note over Success: Create organization
    Note over Success: Link to profile
    Note over Success: Verify profile updated
    Success->>Onboarding: Redirect
    User->>Onboarding: Complete setup
    Onboarding->>Dashboard: Ready to use
```

## Key Differences

### Old Flow Issues
❌ Payment before email verification
❌ Organization created while user not authenticated
❌ Disconnect between auth session and organization
❌ Middleware couldn't find organization_id
❌ Redirect loop to subscribe page

### New Flow Benefits
✅ Email verification required first
✅ Payment only after authentication
✅ Organization created while user authenticated
✅ Profile immediately linked to organization
✅ Middleware finds organization_id
✅ No redirect loops
✅ Tier preserved through metadata
✅ Clearer user journey

## Middleware Logic

### Old Logic
```
if (user && !organization_id) {
  redirect('/subscribe')  // Could cause loop
}
```

### New Logic
```
if (!user && accessing_subscribe) {
  redirect('/signup')
}

if (user && !organization_id && accessing_protected_route) {
  redirect('/subscribe')
}

if (user && organization_id && accessing_auth_pages) {
  redirect('/dashboard' or '/onboarding')
}
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> Anonymous
    Anonymous --> SignedUp: Create account
    SignedUp --> EmailVerified: Verify email
    EmailVerified --> Authenticated: Login
    Authenticated --> HasSubscription: Complete payment
    HasSubscription --> HasOrganization: Organization created
    HasOrganization --> OnboardingDone: Complete onboarding
    OnboardingDone --> [*]: Can use app
    
    note right of SignedUp
      User must verify email
      before proceeding
    end note
    
    note right of HasOrganization
      Profile has organization_id
      No redirect loop possible
    end note
```

## File Responsibility

```mermaid
flowchart TD
    A[Get Started Page] -->|tier param| B[Signup Page]
    B -->|stores tier in metadata| C[Email Verification]
    C --> D[Login Page]
    D -->|checks org_id| E{Has Org?}
    E -->|No| F[Subscribe Page]
    E -->|Yes| G{Onboarding Done?}
    G -->|No| H[Onboarding Page]
    G -->|Yes| I[Dashboard]
    F -->|authenticated only| J[Stripe Checkout]
    J --> K[Success Page]
    K -->|creates org & links| L[Onboarding Page]
    L --> I
    
    style A fill:#e1f5ff
    style B fill:#e1f5ff
    style D fill:#e1f5ff
    style F fill:#fff3cd
    style K fill:#d4edda
    style H fill:#f8d7da
    style I fill:#d1ecf1
```

## Authentication States

| State | Can Access | Redirected To | Notes |
|-------|-----------|---------------|-------|
| **Anonymous** | /, /get-started, /signup, /login | - | Public pages only |
| **Signed Up (unverified)** | Email verification page | - | Must verify email |
| **Verified (no org)** | /subscribe | /subscribe | Must complete payment |
| **Has Org (no onboarding)** | /onboarding, /logout | /onboarding | Must complete setup |
| **Fully Set Up** | All protected routes | /dashboard | Full access |

## Error Recovery Paths

```mermaid
flowchart TD
    A[Error Occurred] --> B{Where?}
    B -->|Signup| C[Show error, allow retry]
    B -->|Subscribe| D[Show error, allow retry]
    B -->|Payment| E[Stripe handles, returns to subscribe]
    B -->|Success Page| F{What failed?}
    F -->|No session_id| G[Show error, contact support]
    F -->|Org creation failed| H[Show error, retry possible]
    F -->|Profile not linked| I[Show error, contact support]
    
    C --> J[User can try again]
    D --> J
    E --> J
    H --> J
    
    G --> K[Manual intervention needed]
    I --> K
```

## Session Storage Data

During the flow, `sessionStorage` holds:

```typescript
{
  pending_subscription: {
    user_id: string,      // UUID of authenticated user
    email: string,        // User's email
    businessName: string, // Business name entered
    tier: string,         // 'operations' or 'operations_pro'
    operationsProLevel: string | null, // 'scale' or 'unlimited'
    totalPrice: number    // Total monthly price in dollars
  }
}
```

This is cleared after successful organization creation.

## User Metadata

During signup, user metadata contains:

```typescript
{
  first_name: string,
  last_name: string,
  selected_tier?: string,  // NEW: Preserved for subscribe page
}
```

This allows the tier selection to be remembered across email verification and login.
