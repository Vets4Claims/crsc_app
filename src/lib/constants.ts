// Combat-Related Codes Reference
export const COMBAT_RELATED_CODES = {
  PH: {
    code: 'PH',
    name: 'Purple Heart',
    description: 'Injury from armed conflict',
  },
  AC: {
    code: 'AC',
    name: 'Armed Conflict',
    description: 'Direct result of armed conflict',
  },
  HS: {
    code: 'HS',
    name: 'Hazardous Service',
    description: 'Demolition, flight, parachuting, etc.',
  },
  SW: {
    code: 'SW',
    name: 'Simulating War',
    description: 'Live fire practice, hand-to-hand combat training',
  },
  IN: {
    code: 'IN',
    name: 'Instrument of War',
    description: 'Injury from military vehicle, weapon, chemical agent',
  },
  AO: {
    code: 'AO',
    name: 'Agent Orange',
    description: 'Exposure to herbicides (presumptive)',
  },
  RE: {
    code: 'RE',
    name: 'Radiation Exposure',
    description: 'Combat-related radiation exposure',
  },
  GW: {
    code: 'GW',
    name: 'Gulf War',
    description: 'Gulf War-related disabilities (presumptive)',
  },
  MG: {
    code: 'MG',
    name: 'Mustard Gas',
    description: 'Exposure to mustard gas or Lewisite',
  },
} as const

export type CombatRelatedCode = keyof typeof COMBAT_RELATED_CODES

// Military Branches
export const MILITARY_BRANCHES = [
  { value: 'army', label: 'Army' },
  { value: 'navy', label: 'Navy' },
  { value: 'air_force', label: 'Air Force' },
  { value: 'marine_corps', label: 'Marine Corps' },
  { value: 'coast_guard', label: 'Coast Guard' },
  { value: 'space_force', label: 'Space Force' },
] as const

export type MilitaryBranch = (typeof MILITARY_BRANCHES)[number]['value']

// Retirement Types
export const RETIREMENT_TYPES = [
  { value: '20_years', label: '20+ Years of Service' },
  { value: 'chapter_61', label: 'Chapter 61 (Medical Retirement)' },
  { value: 'tera', label: 'TERA (Temporary Early Retirement Authority)' },
  { value: 'tdrl', label: 'TDRL (Temporary Disability Retired List)' },
  { value: 'pdrl', label: 'PDRL (Permanent Disability Retired List)' },
] as const

export type RetirementType = (typeof RETIREMENT_TYPES)[number]['value']

// US States
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'PR', label: 'Puerto Rico' },
  { value: 'GU', label: 'Guam' },
  { value: 'VI', label: 'U.S. Virgin Islands' },
  { value: 'AS', label: 'American Samoa' },
] as const

// Branch-Specific Mailing Addresses
export const BRANCH_MAILING_ADDRESSES = {
  army: {
    name: 'Department of the Army',
    address: [
      'U.S. Army Human Resources Command',
      'ATTN: AHRC-PDR-C (CRSC), Dept 420',
      '1600 Spearhead Division Avenue',
      'Fort Knox, KY 40122-5402',
    ],
    email: 'usarmy.knox.hrc.mbx.tagd-crsc-claims@army.mil',
    fax: '502-613-9550',
  },
  navy: {
    name: 'Secretary of the Navy (Navy and Marine Corps)',
    address: [
      'Council of Review Boards',
      'ATTN: Combat Related Special Compensation Branch',
      '720 Kennon Street SE, Suite 309',
      'Washington Navy Yard, DC 20374-5023',
    ],
    email: 'CRSC@navy.mil',
    phone: '877-366-2772',
  },
  marine_corps: {
    name: 'Secretary of the Navy (Navy and Marine Corps)',
    address: [
      'Council of Review Boards',
      'ATTN: Combat Related Special Compensation Branch',
      '720 Kennon Street SE, Suite 309',
      'Washington Navy Yard, DC 20374-5023',
    ],
    email: 'CRSC@navy.mil',
    phone: '877-366-2772',
  },
  air_force: {
    name: 'United States Air Force (Air Force and Space Force)',
    address: [
      'Disability Division (CRSC)',
      'HQ AFPC/DPPDC',
      '550 C Street West',
      'Randolph AFB, TX 78150-4708',
    ],
    phone: '800-525-0102',
  },
  space_force: {
    name: 'United States Air Force (Air Force and Space Force)',
    address: [
      'Disability Division (CRSC)',
      'HQ AFPC/DPPDC',
      '550 C Street West',
      'Randolph AFB, TX 78150-4708',
    ],
    phone: '800-525-0102',
  },
  coast_guard: {
    name: 'Coast Guard',
    address: [
      'Commander (PSC-PSD-MED)',
      'Personnel Service Center, ATTN: CRSC',
      '2703 Martin Luther King Jr. Avenue SE',
      'Washington, DC 20593-7200',
    ],
    email: 'ARL-SMB-CGPSC-PSD-CRSC@uscg.mil',
  },
} as const

// Document Types
export const DOCUMENT_TYPES = [
  { value: 'dd214', label: 'DD214/DD215', required: true },
  { value: 'retirement_orders', label: 'Retirement Orders', required: true },
  { value: 'va_decision_letter', label: 'VA Rating Decision Letter / Code Sheet', required: true },
  { value: 'medical_records', label: 'Medical Records', required: false },
  { value: 'purple_heart', label: 'Purple Heart Documentation', required: false },
  { value: 'awards_citations', label: 'Awards/Citations', required: false },
  { value: 'service_records', label: 'Service Records (After-Action Reports, DA 4187, etc.)', required: false },
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]['value']

// Application Steps
export const APPLICATION_STEPS = [
  { id: 'eligibility', name: 'Eligibility', description: 'Verify CRSC eligibility' },
  { id: 'personal_info', name: 'Personal Information', description: 'Your contact details' },
  { id: 'military_service', name: 'Military Service', description: 'Service history' },
  { id: 'va_disability', name: 'VA Disability', description: 'VA rating information' },
  { id: 'disability_claims', name: 'Disability Claims', description: 'Combat-related claims' },
  { id: 'documents', name: 'Documents', description: 'Upload supporting documents' },
  { id: 'review', name: 'Review', description: 'Review your application' },
  { id: 'payment', name: 'Payment', description: 'Complete payment' },
  { id: 'download', name: 'Download', description: 'Download your packet' },
] as const

export type ApplicationStepId = (typeof APPLICATION_STEPS)[number]['id']

// Payment Amount
export const PAYMENT_AMOUNT = Number(import.meta.env.VITE_PAYMENT_AMOUNT) || 99.00

// Session Timeout
export const SESSION_TIMEOUT_MINUTES = Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES) || 30

// File Upload Limits
export const FILE_UPLOAD_LIMITS = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/tiff',
  ],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif'],
} as const
