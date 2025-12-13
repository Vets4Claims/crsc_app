# CRSC Filing Assistant - Technical Specification

## Project Overview

A HIPAA-compliant web application that assists military veterans in filing for Combat-Related Special Compensation (CRSC). The application uses AI-powered chat to guide veterans through the complex filing process, collect necessary information, generate required documents, and prepare complete submission packets.

## Architecture

### Technology Stack

- **Frontend**: React 18+ with Vite
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Database**: PostgreSQL on Google Cloud Platform (separate instance)
- **AI Integration**: Anthropic Claude API via Supabase Edge Functions
- **Payment Processing**: Stripe
- **Document Generation**: PDF generation library (pdf-lib or react-pdf)
- **Authentication**: Supabase Auth

### System Architecture

```
┌─────────────────┐
│   React-Vite    │
│   Frontend      │
└────────┬────────┘
         │
         │ (API Calls)
         │
┌────────▼────────────┐
│  Supabase Edge      │
│  Functions          │
│  - AI Chat Handler  │
│  - PDF Generator    │
│  - Payment Handler  │
└────────┬────────────┘
         │
         │ (SQL Queries)
         │
┌────────▼────────────┐
│  PostgreSQL DB      │
│  (Google Cloud)     │
│  - User Data        │
│  - Form Data        │
│  - Documents        │
└─────────────────────┘
```

## HIPAA Compliance Requirements

### Data Handling Rules

1. **Storage**: All Protected Health Information (PHI) stored ONLY in PostgreSQL database
2. **Transmission**: All data encrypted in transit (HTTPS/TLS)
3. **Access Control**: Role-based access with audit logging
4. **Document Generation**: Data pulled from DB only during active generation/preview
5. **Session Management**: Secure session handling with automatic timeout
6. **Audit Trail**: Complete logging of all PHI access

### Security Measures

- End-to-end encryption for all API calls
- No PHI stored in browser local storage
- Secure password requirements (minimum 12 characters)
- Multi-factor authentication (optional but recommended)
- Regular security audits and logging
- Data retention policies compliant with regulations

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    profile_completed BOOLEAN DEFAULT FALSE,
    packet_status VARCHAR(50) DEFAULT 'not_started'
);
```

### Personal Information Table
```sql
CREATE TABLE personal_information (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    middle_initial VARCHAR(10),
    last_name VARCHAR(100),
    ssn_encrypted TEXT, -- Encrypted SSN
    date_of_birth DATE,
    email VARCHAR(255),
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Military Service Table
```sql
CREATE TABLE military_service (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    branch VARCHAR(50), -- Army, Navy, Air Force, Marine Corps, Coast Guard
    service_number VARCHAR(100),
    retired_rank VARCHAR(50),
    retirement_date DATE,
    years_of_service INTEGER,
    retirement_type VARCHAR(100), -- 20+ years, Chapter 61, TERA, TDRL, PDRL
    dd214_uploaded BOOLEAN DEFAULT FALSE,
    retirement_orders_uploaded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### VA Disability Information Table
```sql
CREATE TABLE va_disability_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    va_file_number VARCHAR(100),
    current_va_rating INTEGER, -- Percentage (10-100)
    va_decision_date DATE,
    has_va_waiver BOOLEAN DEFAULT FALSE,
    receives_crdp BOOLEAN DEFAULT FALSE,
    code_sheet_uploaded BOOLEAN DEFAULT FALSE,
    decision_letter_uploaded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Disability Claims Table
```sql
CREATE TABLE disability_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    disability_title VARCHAR(255),
    disability_code VARCHAR(20),
    body_part_affected VARCHAR(255),
    date_awarded_by_va DATE,
    initial_rating_percentage INTEGER,
    current_rating_percentage INTEGER,
    combat_related_code VARCHAR(10), -- PH, AC, HS, SW, IN, AO, RE, GW, MG
    unit_of_assignment VARCHAR(255),
    location_of_injury VARCHAR(255),
    description_of_event TEXT,
    received_purple_heart BOOLEAN DEFAULT FALSE,
    has_secondary_conditions BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Secondary Conditions Table
```sql
CREATE TABLE secondary_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_claim_id UUID REFERENCES disability_claims(id) ON DELETE CASCADE,
    disability_code VARCHAR(20),
    description TEXT,
    percentage INTEGER,
    date_awarded DATE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Documents Table
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(100), -- DD214, retirement_orders, va_decision, medical_records, etc.
    file_name VARCHAR(255),
    file_path TEXT, -- GCS path
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    verified BOOLEAN DEFAULT FALSE
);
```

### Chat History Table
```sql
CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Packet Status Table
```sql
CREATE TABLE packet_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    step_name VARCHAR(100),
    step_status VARCHAR(50), -- not_started, in_progress, completed, requires_review
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Payments Table
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_id VARCHAR(255),
    amount DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50), -- pending, completed, failed, refunded
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Audit Log Table
```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100),
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Application Flow

### Phase 1: Onboarding & Authentication

1. **Landing Page**
   - Overview of CRSC benefits
   - Eligibility requirements
   - How the service works
   - Pricing information
   - Sign up / Sign in buttons

2. **Authentication**
   - Email/password registration
   - Email verification
   - Optional 2FA setup

3. **Welcome & Onboarding**
   - Interactive tutorial
   - Overview of the filing process
   - Expected timeline
   - Required documents checklist

### Phase 2: Eligibility Check

1. **Initial Questionnaire** (Chat-guided)
   - Are you currently retired with military retirement pay?
   - Do you have a VA disability rating of at least 10%?
   - Is your DoD retirement reduced by VA disability payments?
   - Retirement qualification (20+ years, Chapter 61, TERA, TDRL, PDRL)

2. **Eligibility Determination**
   - If eligible → Proceed to data collection
   - If not eligible → Explain why and provide resources

### Phase 3: Information Collection (Chat-Guided)

**Step 1: Personal Information**
- Full name, SSN, date of birth
- Contact information (address, phone, email)
- Current mailing address

**Step 2: Military Service History**
- Branch of service
- Dates of service
- Retirement status and date
- Service number
- Rank at retirement

**Step 3: VA Disability Information**
- VA file number
- Current combined VA rating
- Date of most recent VA decision
- List of all service-connected disabilities
- VA rating decision letter upload

**Step 4: Combat-Related Disability Claims**
For each disability:
- Disability title and VA code
- Body part affected
- Initial and current rating percentages
- Combat-related code (PH, AC, HS, SW, IN, AO, RE, GW, MG)
- Unit of assignment when injured
- Location/area of assignment when injured
- Detailed description of event
- Purple Heart information (if applicable)
- Secondary conditions

**Step 5: Supporting Documentation**
- DD214/DD215 upload
- Retirement orders upload
- VA rating decisions and code sheets
- Medical records from time of injury
- Award certificates/citations
- Purple Heart documentation (if applicable)
- Military treatment facility records
- Official service records (after-action reports, DA 4187, etc.)

### Phase 4: Document Review & Preparation

1. **Information Review Dashboard**
   - Display collected information in organized sections
   - Edit capability for each section
   - Completeness indicators
   - Missing information alerts

2. **Document Preview**
   - Preview DD Form 2860 with populated data (read-only)
   - Supporting documents checklist
   - Combat-related evidence verification

3. **AI-Powered Review**
   - Check for completeness
   - Identify potential issues
   - Suggest improvements to descriptions
   - Flag missing critical evidence

### Phase 5: Payment & Final Package Generation

1. **Package Summary**
   - List of all documents to be included
   - Submission address for service branch
   - Estimated processing time

2. **Payment Processing**
   - One-time fee for package generation
   - Secure Stripe checkout
   - Payment confirmation

3. **Package Generation**
   - Generate completed DD Form 2860 (PDF)
   - Compile all supporting documents
   - Create submission cover letter
   - Generate mailing instructions
   - ZIP package for download

4. **Submission Instructions**
   - Branch-specific mailing address
   - Recommended mailing method (certified mail)
   - Follow-up timeline
   - What to expect after submission
   - How to request reconsideration

### Phase 6: Post-Submission Support

1. **Status Tracking Dashboard**
   - Date submitted
   - Expected response timeframe
   - Status updates (user-entered)

2. **Reconsideration Assistance**
   - If denied, help with reconsideration request
   - Guide for additional evidence
   - Branch-specific reconsideration forms

## AI Chat Integration

### Chat Interface Design

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    step?: string;
    action?: string;
    requires_input?: boolean;
  };
}

interface ChatState {
  messages: Message[];
  currentStep: string;
  isLoading: boolean;
  collectedData: Record<string, any>;
}
```

### AI System Prompt

```
You are a CRSC (Combat-Related Special Compensation) filing assistant helping military veterans file for their combat-related disability compensation. Your role is to:

1. Guide veterans through the CRSC eligibility requirements
2. Collect all necessary information in a conversational manner
3. Explain complex military and VA terminology in plain language
4. Help veterans understand what documentation they need
5. Assist in describing combat-related events accurately
6. Ensure completeness before package generation

Key Guidelines:
- Be empathetic and patient
- Use clear, simple language
- Verify eligibility before proceeding
- Explain the combat-related codes (PH, AC, HS, SW, IN, AO, RE, GW, MG)
- Help identify which disabilities may qualify as combat-related
- Remind veterans NOT to send original documents
- Note: Following the Supreme Court's June 2025 ruling in Soto v. United States, the previous 6-year back pay limit has been eliminated. Eligible veterans may now receive full retroactive payments to their initial eligibility date.

Reference Information:
[Include parsed content from crsc_va.txt and CRSC_REFERENCE.pdf]
```

### Chat Features

1. **Contextual Awareness**
   - Track current step in the process
   - Remember previously provided information
   - Suggest next steps based on progress

2. **Smart Prompts**
   - Pre-filled quick responses
   - Common questions and answers
   - Document upload reminders

3. **Validation**
   - Real-time data validation
   - Format checking (SSN, dates, etc.)
   - Completeness verification

4. **Saving & Resume**
   - Auto-save conversation state
   - Resume from last position
   - Progress indicators

## Document Generation

### DD Form 2860 Generation

```typescript
interface DDForm2860Data {
  personalInfo: {
    lastName: string;
    firstName: string;
    middleInitial: string;
    ssn: string;
    retiredRank: string;
    dateOfBirth: string;
    telephone: string;
    email: string;
    mailingAddress: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  
  serviceHistory: {
    branch: string;
    retirementQualification: string;
  };
  
  disabilities: Array<{
    vaFileNumber: string;
    disabilityTitle: string;
    bodyPartAffected: string;
    vaDisabilityCode: string;
    dateAwarded: string;
    initialRating: number;
    currentRating: number;
    combatRelatedCode: string;
    unitOfAssignment: string;
    locationWhenInjured: string;
    eventDescription: string;
    receivedPurpleHeart: boolean;
    secondaryConditions: boolean;
  }>;
  
  signature: {
    signed: boolean;
    date: string;
  };
}
```

### PDF Generation Process

1. **Data Retrieval** (Edge Function)
   ```typescript
   // Fetch data from PostgreSQL on Google Cloud
   const userData = await fetchUserData(userId);
   const formData = transformToDD2860Format(userData);
   ```

2. **PDF Template Population**
   - Use pdf-lib to fill PDF form fields
   - Or use react-pdf to generate from scratch
   - Maintain exact form specifications

3. **Supporting Documents Compilation**
   - Retrieve uploaded documents from Google Cloud Storage
   - Verify document completeness
   - Create organized package structure

4. **Package Assembly**
   ```
   CRSC_Package_[LastName]_[Date]/
   ├── DD_Form_2860.pdf
   ├── Cover_Letter.pdf
   ├── Submission_Instructions.pdf
   ├── Supporting_Documents/
   │   ├── DD214.pdf
   │   ├── Retirement_Orders.pdf
   │   ├── VA_Rating_Decision.pdf
   │   ├── VA_Code_Sheet.pdf
   │   ├── Medical_Records/
   │   │   ├── Medical_Record_1.pdf
   │   │   └── ...
   │   └── Awards_Citations/
   │       ├── Purple_Heart.pdf
   │       └── ...
   └── README.txt
   ```

## User Interface Design

### Component Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ResetPassword.tsx
│   ├── chat/
│   │   ├── ChatInterface.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInput.tsx
│   │   └── QuickResponses.tsx
│   ├── forms/
│   │   ├── PersonalInfoForm.tsx
│   │   ├── MilitaryServiceForm.tsx
│   │   ├── VADisabilityForm.tsx
│   │   ├── DisabilityClaimForm.tsx
│   │   └── DocumentUpload.tsx
│   ├── dashboard/
│   │   ├── ProgressTracker.tsx
│   │   ├── StepIndicator.tsx
│   │   ├── DataSummary.tsx
│   │   └── DocumentsChecklist.tsx
│   ├── review/
│   │   ├── InformationReview.tsx
│   │   ├── DocumentPreview.tsx
│   │   └── EditModal.tsx
│   ├── payment/
│   │   ├── CheckoutForm.tsx
│   │   └── PaymentSuccess.tsx
│   └── download/
│       ├── PackageDownload.tsx
│       └── SubmissionInstructions.tsx
├── pages/
│   ├── Landing.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Onboarding.tsx
│   ├── Dashboard.tsx
│   ├── Chat.tsx
│   ├── Review.tsx
│   ├── Payment.tsx
│   └── Download.tsx
├── lib/
│   ├── supabase.ts
│   ├── api.ts
│   ├── validation.ts
│   └── constants.ts
└── hooks/
    ├── useAuth.ts
    ├── useChat.ts
    ├── useFormData.ts
    └── usePayment.ts
```

### Design System

**Colors**
- Primary: Military/Government Blue (#003f87)
- Secondary: Gold (#fdb81e)
- Success: Green (#22c55e)
- Warning: Orange (#f97316)
- Error: Red (#ef4444)
- Background: Off-white (#f8fafc)
- Text: Dark gray (#1e293b)

**Typography**
- Headings: Inter (font-weight: 600-700)
- Body: Inter (font-weight: 400)
- Monospace: JetBrains Mono (for codes/numbers)

**Components** (shadcn/ui)
- Button
- Input
- Card
- Alert
- Progress
- Dialog
- Select
- Textarea
- Checkbox
- Radio Group
- Tabs

### Key UI Features

1. **Progress Tracker**
   - Visual representation of completion
   - Steps: Eligibility → Information → Documents → Review → Payment → Download
   - Percentage complete indicator

2. **Step-by-Step Wizard**
   - Previous/Next navigation
   - Save and continue later
   - Skip optional sections

3. **Document Upload**
   - Drag-and-drop interface
   - File type validation
   - Size limits (max 10MB per file)
   - Preview uploaded documents
   - OCR for text extraction (optional)

4. **Responsive Design**
   - Mobile-first approach
   - Works on tablet and desktop
   - Touch-friendly interface

## Supabase Edge Functions

### Function: chat-handler

```typescript
// supabase/functions/chat-handler/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from '@anthropic-ai/sdk'

serve(async (req) => {
  const { userId, message, conversationHistory } = await req.json()
  
  // Fetch user context from PostgreSQL
  const userContext = await fetchUserContext(userId)
  
  // Build system prompt with CRSC reference information
  const systemPrompt = buildSystemPrompt(userContext)
  
  // Call Claude API
  const anthropic = new Anthropic({
    apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
  })
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: conversationHistory,
  })
  
  // Save message to chat history
  await saveChatMessage(userId, message, response.content[0].text)
  
  return new Response(JSON.stringify({ reply: response.content[0].text }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Function: generate-pdf

```typescript
// supabase/functions/generate-pdf/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { PDFDocument } from 'pdf-lib'

serve(async (req) => {
  const { userId, documentType } = await req.json()
  
  // Fetch user data from PostgreSQL
  const userData = await fetchUserData(userId)
  
  // Generate PDF based on document type
  let pdfBytes
  
  if (documentType === 'dd2860') {
    pdfBytes = await generateDD2860(userData)
  } else if (documentType === 'cover-letter') {
    pdfBytes = await generateCoverLetter(userData)
  }
  
  // Return PDF as base64
  return new Response(JSON.stringify({ pdf: btoa(pdfBytes) }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Function: payment-handler

```typescript
// supabase/functions/payment-handler/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'stripe'

serve(async (req) => {
  const { userId, amount } = await req.json()
  
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
    apiVersion: '2023-10-16',
  })
  
  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Convert to cents
    currency: 'usd',
    metadata: { userId },
  })
  
  // Save payment record
  await savePaymentRecord(userId, paymentIntent.id, amount)
  
  return new Response(JSON.stringify({ 
    clientSecret: paymentIntent.client_secret 
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Function: db-query

```typescript
// supabase/functions/db-query/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Client } from 'https://deno.land/x/postgres/mod.ts'

serve(async (req) => {
  const { query, params } = await req.json()
  
  // Connect to PostgreSQL on Google Cloud
  const client = new Client({
    hostname: Deno.env.get('DB_HOST'),
    port: 5432,
    user: Deno.env.get('DB_USER'),
    password: Deno.env.get('DB_PASSWORD'),
    database: Deno.env.get('DB_NAME'),
    tls: {
      enabled: true,
      enforce: true,
    },
  })
  
  await client.connect()
  
  const result = await client.queryObject(query, params)
  
  await client.end()
  
  return new Response(JSON.stringify({ data: result.rows }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

## Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Database (Google Cloud PostgreSQL)
DB_HOST=your-gcp-ip-or-domain
DB_PORT=5432
DB_NAME=crsc_filing
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Anthropic API
ANTHROPIC_API_KEY=your-anthropic-key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key

# Google Cloud Storage (for document uploads)
GCS_BUCKET_NAME=crsc-documents
GCS_PROJECT_ID=your-gcp-project-id
GCS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY=your-private-key

# Application
VITE_APP_URL=https://yourapp.com
PAYMENT_AMOUNT=99.00
```

## Security Considerations

1. **Data Encryption**
   - SSN encrypted at rest using AES-256
   - All API communications over HTTPS
   - Database connections using SSL/TLS

2. **Authentication & Authorization**
   - JWT-based authentication via Supabase Auth
   - Row-level security (RLS) policies
   - API rate limiting

3. **Input Validation**
   - Server-side validation of all inputs
   - Sanitization of user-provided text
   - File upload restrictions (type, size)

4. **Audit Logging**
   - Log all PHI access
   - Track document views/downloads
   - Monitor failed authentication attempts

5. **Session Management**
   - Secure session tokens
   - Auto-logout after inactivity (30 minutes)
   - Secure cookie settings

## Testing Strategy

1. **Unit Tests**
   - Component rendering
   - Utility functions
   - Form validation

2. **Integration Tests**
   - API endpoint testing
   - Database operations
   - PDF generation

3. **End-to-End Tests**
   - Complete user journey
   - Payment flow
   - Document generation and download

4. **Security Testing**
   - Penetration testing
   - HIPAA compliance audit
   - Vulnerability scanning

## Deployment

### Frontend Deployment (Vercel/Netlify)

```bash
# Build command
npm run build

# Output directory
dist/
```

### Edge Functions Deployment

```bash
# Deploy to Supabase
supabase functions deploy chat-handler
supabase functions deploy generate-pdf
supabase functions deploy payment-handler
supabase functions deploy db-query
```

### Database Setup (Google Cloud)

```bash
# Create database
gcloud sql databases create crsc_filing --instance=your-instance

# Run migrations
psql -h [IP] -U [USER] -d crsc_filing -f migrations/001_initial_schema.sql
```

## Combat-Related Codes Reference

- **PH**: Purple Heart - Injury from armed conflict
- **AC**: Armed Conflict - Direct result of armed conflict
- **HS**: Hazardous Service - Demolition, flight, parachuting, etc.
- **SW**: Simulating War - Live fire practice, hand-to-hand combat training
- **IN**: Instrument of War - Injury from military vehicle, weapon, chemical agent
- **AO**: Agent Orange - Exposure to herbicides (presumptive)
- **RE**: Radiation Exposure - Combat-related radiation exposure
- **GW**: Gulf War - Gulf War-related disabilities (presumptive)
- **MG**: Mustard Gas - Exposure to mustard gas or Lewisite

## Branch-Specific Mailing Addresses

### Army
```
Department of the Army
U.S. Army Human Resources Command
ATTN: AHRC-PDR-C (CRSC), Dept 420
1600 Spearhead Division Avenue
Fort Knox, KY 40122-5402

Email: usarmy.knox.hrc.mbx.tagd-crsc-claims@army.mil
Fax: 502-613-9550
```

### Navy and Marine Corps
```
Secretary of the Navy
Council of Review Boards
ATTN: Combat Related Special Compensation Branch
720 Kennon Street SE, Suite 309
Washington Navy Yard, DC 20374-5023

Email: CRSC@navy.mil
Phone: 877-366-2772
```

### Air Force and Space Force
```
United States Air Force
Disability Division (CRSC)
HQ AFPC/DPPDC
550 C Street West
Randolph AFB, TX 78150-4708

Phone: 800-525-0102
```

### Coast Guard
```
Commander (PSC-PSD-MED)
Personnel Service Center, ATTN: CRSC
2703 Martin Luther King Jr. Avenue SE
Washington, DC 20593-7200

Email: ARL-SMB-CGPSC-PSD-CRSC@uscg.mil
```

## Development Phases

### Phase 1: Foundation (Weeks 1-2)
- Project setup (Vite + React + Tailwind)
- Supabase configuration
- PostgreSQL database setup on Google Cloud
- Authentication implementation
- Basic routing structure

### Phase 2: Core Features (Weeks 3-4)
- Chat interface development
- AI integration with Claude API
- Form components for data collection
- Database CRUD operations
- File upload functionality

### Phase 3: Document Generation (Weeks 5-6)
- DD Form 2860 PDF generation
- Supporting documents compilation
- Package assembly logic
- Preview functionality

### Phase 4: Payment & Security (Week 7)
- Stripe integration
- Payment processing flow
- Security hardening
- HIPAA compliance review

### Phase 5: Testing & Refinement (Week 8)
- Comprehensive testing
- Bug fixes
- UI/UX improvements
- Performance optimization

### Phase 6: Deployment (Week 9)
- Production deployment
- Documentation
- User training materials
- Launch

## Success Metrics

1. **User Completion Rate**: % of users who complete the filing process
2. **Time to Complete**: Average time from sign-up to package download
3. **Approval Rate**: % of CRSC applications approved (tracked via user feedback)
4. **User Satisfaction**: NPS score and user feedback ratings
5. **System Performance**: API response times, uptime percentage
6. **Security**: Zero data breaches, compliance audit results

## Support & Maintenance

1. **User Support**
   - FAQ section
   - Email support
   - Chat support (business hours)

2. **System Monitoring**
   - Error tracking (Sentry)
   - Performance monitoring
   - Database health checks
   - Regular security audits

3. **Updates**
   - Quarterly feature updates
   - Annual HIPAA compliance review
   - Regular dependency updates
   - VA regulation updates

## Additional Resources

- DD Form 2860: https://www.esd.whs.mil/Portals/54/Documents/DD/forms/dd/dd2860.pdf
- VA CRSC Information: https://www.va.gov/disability/combat-related-special-compensation/
- DOD FMR Volume 7B Chapter 63: Combat-Related Special Compensation
- HIPAA Compliance Guidelines: https://www.hhs.gov/hipaa/

---

**Version**: 1.0
**Last Updated**: December 10, 2025
**Author**: Technical Specification for CRSC Filing Assistant