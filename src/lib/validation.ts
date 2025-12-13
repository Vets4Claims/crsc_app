import { z } from 'zod'

// SSN validation regex (format: XXX-XX-XXXX)
const ssnRegex = /^\d{3}-\d{2}-\d{4}$/

// Phone validation regex (accepts various formats)
const phoneRegex = /^[\d\s\-\(\)\+]+$/

// Personal Information Schema
export const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  middleInitial: z.string().max(10).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100),
  ssn: z.string().regex(ssnRegex, 'SSN must be in format XXX-XX-XXXX'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number'),
  addressLine1: z.string().min(1, 'Address is required').max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(50),
  zipCode: z.string().min(5, 'ZIP code is required').max(20),
})

export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>

// Military Service Schema
export const militaryServiceSchema = z.object({
  branch: z.string().min(1, 'Branch of service is required'),
  serviceNumber: z.string().max(100).optional(),
  retiredRank: z.string().min(1, 'Retired rank is required').max(50),
  retirementDate: z.string().min(1, 'Retirement date is required'),
  yearsOfService: z.number().min(0).max(50).optional(),
  retirementType: z.string().min(1, 'Retirement type is required'),
})

export type MilitaryServiceFormData = z.infer<typeof militaryServiceSchema>

// VA Disability Info Schema
export const vaDisabilityInfoSchema = z.object({
  vaFileNumber: z.string().min(1, 'VA file number is required').max(100),
  currentVaRating: z.number().min(10, 'Minimum VA rating is 10%').max(100, 'Maximum VA rating is 100%'),
  vaDecisionDate: z.string().min(1, 'VA decision date is required'),
  hasVaWaiver: z.boolean(),
  receivesCrdp: z.boolean(),
})

export type VADisabilityInfoFormData = z.infer<typeof vaDisabilityInfoSchema>

// Disability Claim Schema
export const disabilityClaimSchema = z.object({
  disabilityTitle: z.string().min(1, 'Disability title is required').max(255),
  disabilityCode: z.string().max(20).optional(),
  bodyPartAffected: z.string().min(1, 'Body part affected is required').max(255),
  dateAwardedByVa: z.string().min(1, 'Date awarded is required'),
  initialRatingPercentage: z.number().min(0).max(100),
  currentRatingPercentage: z.number().min(0).max(100),
  combatRelatedCode: z.string().min(1, 'Combat-related code is required'),
  unitOfAssignment: z.string().min(1, 'Unit of assignment is required').max(255),
  locationOfInjury: z.string().min(1, 'Location of injury is required').max(255),
  descriptionOfEvent: z.string().min(50, 'Description must be at least 50 characters').max(5000),
  receivedPurpleHeart: z.boolean(),
  hasSecondaryConditions: z.boolean(),
})

export type DisabilityClaimFormData = z.infer<typeof disabilityClaimSchema>

// Secondary Condition Schema
export const secondaryConditionSchema = z.object({
  disabilityCode: z.string().max(20).optional(),
  description: z.string().min(1, 'Description is required').max(1000),
  percentage: z.number().min(0).max(100),
  dateAwarded: z.string().optional(),
})

export type SecondaryConditionFormData = z.infer<typeof secondaryConditionSchema>

// Login Schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>

// Registration Schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export type RegisterFormData = z.infer<typeof registerSchema>

// Reset Password Schema
export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

// New Password Schema
export const newPasswordSchema = z.object({
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export type NewPasswordFormData = z.infer<typeof newPasswordSchema>

// Eligibility Schema
export const eligibilitySchema = z.object({
  isRetiredWithPay: z.boolean(),
  hasVaRating: z.boolean(),
  isReductionApplied: z.boolean(),
  retirementQualification: z.string().optional(),
})

export type EligibilityFormData = z.infer<typeof eligibilitySchema>

// Helper function to format SSN for display (masked)
export function maskSSN(ssn: string): string {
  if (!ssn) return ''
  return `XXX-XX-${ssn.slice(-4)}`
}

// Helper function to validate file upload
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024 // 50MB
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/tiff',
  ]

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 50MB' }
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed. Please upload PDF or image files.' }
  }

  return { valid: true }
}
