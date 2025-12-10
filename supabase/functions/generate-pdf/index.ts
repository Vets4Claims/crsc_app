import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create PostgreSQL client for Google Cloud
async function getDbClient(): Promise<Client> {
  const client = new Client({
    hostname: Deno.env.get('DB_HOST')!,
    port: parseInt(Deno.env.get('DB_PORT') || '5432'),
    user: Deno.env.get('DB_USER')!,
    password: Deno.env.get('DB_PASSWORD')!,
    database: Deno.env.get('DB_NAME')!,
    tls: {
      enabled: true,
      enforce: true,
    },
  })
  await client.connect()
  return client
}

interface GeneratePDFRequest {
  userId: string
  documentType: 'dd2860' | 'cover-letter' | 'package'
}

// Branch-specific mailing addresses
const BRANCH_ADDRESSES = {
  army: {
    name: 'Department of the Army',
    address: 'U.S. Army Human Resources Command\nATTN: AHRC-PDR-C (CRSC), Dept 420\n1600 Spearhead Division Avenue\nFort Knox, KY 40122-5402',
    email: 'usarmy.knox.hrc.mbx.tagd-crsc-claims@army.mil',
  },
  navy: {
    name: 'Secretary of the Navy',
    address: 'Council of Review Boards\nATTN: Combat Related Special Compensation Branch\n720 Kennon Street SE, Suite 309\nWashington Navy Yard, DC 20374-5023',
    email: 'CRSC@navy.mil',
  },
  marine_corps: {
    name: 'Secretary of the Navy',
    address: 'Council of Review Boards\nATTN: Combat Related Special Compensation Branch\n720 Kennon Street SE, Suite 309\nWashington Navy Yard, DC 20374-5023',
    email: 'CRSC@navy.mil',
  },
  air_force: {
    name: 'United States Air Force',
    address: 'Disability Division (CRSC)\nHQ AFPC/DPPDC\n550 C Street West\nRandolph AFB, TX 78150-4708',
  },
  space_force: {
    name: 'United States Space Force',
    address: 'Disability Division (CRSC)\nHQ AFPC/DPPDC\n550 C Street West\nRandolph AFB, TX 78150-4708',
  },
  coast_guard: {
    name: 'Coast Guard',
    address: 'Commander (PSC-PSD-MED)\nPersonnel Service Center, ATTN: CRSC\n2703 Martin Luther King Jr. Avenue SE\nWashington, DC 20593-7200',
    email: 'ARL-SMB-CGPSC-PSD-CRSC@uscg.mil',
  },
}

// Combat-related code descriptions
const COMBAT_CODES = {
  PH: 'Purple Heart - Injury from armed conflict',
  AC: 'Armed Conflict - Direct result of armed conflict',
  HS: 'Hazardous Service - Demolition, flight, parachuting, etc.',
  SW: 'Simulating War - Live fire practice, hand-to-hand combat training',
  IN: 'Instrument of War - Injury from military vehicle, weapon, chemical agent',
  AO: 'Agent Orange - Exposure to herbicides',
  RE: 'Radiation Exposure - Combat-related radiation exposure',
  GW: 'Gulf War - Gulf War-related disabilities',
  MG: 'Mustard Gas - Exposure to mustard gas or Lewisite',
}

async function generateCoverLetter(
  pdfDoc: typeof PDFDocument,
  userData: any,
  militaryService: any,
  claims: any[]
): Promise<Uint8Array> {
  const page = pdfDoc.addPage([612, 792]) // Letter size
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

  const { width, height } = page.getSize()
  const margin = 72 // 1 inch margin
  let yPosition = height - margin

  const drawText = (text: string, options: { bold?: boolean; size?: number; indent?: number } = {}) => {
    const fontSize = options.size || 12
    const textFont = options.bold ? boldFont : font
    const xPosition = margin + (options.indent || 0)

    page.drawText(text, {
      x: xPosition,
      y: yPosition,
      size: fontSize,
      font: textFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= fontSize + 4
  }

  const drawParagraph = (text: string, lineHeight = 14) => {
    const words = text.split(' ')
    let line = ''
    const maxWidth = width - (2 * margin)

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word
      const textWidth = font.widthOfTextAtSize(testLine, 12)

      if (textWidth > maxWidth) {
        drawText(line)
        line = word
      } else {
        line = testLine
      }
    }
    if (line) {
      drawText(line)
    }
    yPosition -= lineHeight / 2
  }

  const branchInfo = BRANCH_ADDRESSES[militaryService?.branch as keyof typeof BRANCH_ADDRESSES]
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Header
  drawText(today)
  yPosition -= 20

  // Address block
  if (branchInfo) {
    drawText(branchInfo.name)
    for (const line of branchInfo.address.split('\n')) {
      drawText(line)
    }
  }
  yPosition -= 20

  // Subject line
  drawText(`Subject: Application for Combat-Related Special Compensation (CRSC)`, { bold: true })
  yPosition -= 10

  // Applicant info
  drawText(`Applicant: ${userData?.first_name} ${userData?.middle_initial || ''} ${userData?.last_name}`)
  if (userData?.ssn_encrypted) {
    drawText(`SSN: XXX-XX-${userData.ssn_encrypted.slice(-4)}`)
  }
  yPosition -= 20

  // Body
  drawText('Dear CRSC Review Board,', { bold: true })
  yPosition -= 10

  drawParagraph(`I am hereby submitting my application for Combat-Related Special Compensation (CRSC) in accordance with 10 U.S.C. § 1413a. I am a retired member of the ${getBranchName(militaryService?.branch)} and have VA-rated service-connected disabilities that I believe qualify for CRSC.`)
  yPosition -= 10

  drawParagraph(`Enclosed with this application, please find:`)
  yPosition -= 5

  drawText('1. Completed DD Form 2860', { indent: 20 })
  drawText('2. Copy of DD Form 214/215', { indent: 20 })
  drawText('3. Copy of Retirement Orders', { indent: 20 })
  drawText('4. Copy of VA Rating Decision Letter', { indent: 20 })
  drawText('5. Copy of VA Code Sheet', { indent: 20 })
  drawText('6. Supporting medical documentation', { indent: 20 })
  yPosition -= 10

  drawParagraph(`I am claiming ${claims.length} service-connected ${claims.length === 1 ? 'disability' : 'disabilities'} as combat-related:`)
  yPosition -= 5

  for (let i = 0; i < claims.length && i < 5; i++) {
    const claim = claims[i]
    const codeDesc = COMBAT_CODES[claim.combat_related_code as keyof typeof COMBAT_CODES] || claim.combat_related_code
    drawText(`${i + 1}. ${claim.disability_title} (${claim.current_rating_percentage}%) - ${codeDesc}`, { indent: 20 })
  }
  if (claims.length > 5) {
    drawText(`   ... and ${claims.length - 5} additional ${claims.length - 5 === 1 ? 'claim' : 'claims'}`, { indent: 20 })
  }
  yPosition -= 10

  drawParagraph(`I certify that the information provided in this application and all supporting documentation is true and accurate to the best of my knowledge. I understand that providing false information may result in denial of benefits and potential legal consequences.`)
  yPosition -= 10

  drawParagraph(`Please contact me at the address or phone number provided on DD Form 2860 if you require any additional information or documentation.`)
  yPosition -= 20

  drawText('Respectfully submitted,')
  yPosition -= 40

  drawText('_________________________________')
  drawText(`${userData?.first_name} ${userData?.middle_initial || ''} ${userData?.last_name}`)
  if (militaryService?.retired_rank) {
    drawText(`${militaryService.retired_rank}, ${getBranchName(militaryService?.branch)} (Retired)`)
  }

  return pdfDoc.save()
}

function getBranchName(branch: string): string {
  const names: Record<string, string> = {
    army: 'United States Army',
    navy: 'United States Navy',
    air_force: 'United States Air Force',
    marine_corps: 'United States Marine Corps',
    coast_guard: 'United States Coast Guard',
    space_force: 'United States Space Force',
  }
  return names[branch] || branch
}

async function generateDD2860(
  userData: any,
  militaryService: any,
  vaDisability: any,
  claims: any[]
): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // DD Form 2860 is a multi-page form
  // Page 1 - Basic Information
  let page = pdfDoc.addPage([612, 792])
  const { width, height } = page.getSize()

  let yPosition = height - 50

  // Title
  page.drawText('DD FORM 2860 - CLAIM FOR COMBAT-RELATED SPECIAL COMPENSATION (CRSC)', {
    x: 50,
    y: yPosition,
    size: 10,
    font: boldFont,
  })
  yPosition -= 30

  // Section 1 - Personal Information
  page.drawText('SECTION I - PERSONAL INFORMATION', {
    x: 50,
    y: yPosition,
    size: 10,
    font: boldFont,
  })
  yPosition -= 20

  const fields = [
    { label: '1. NAME (Last, First, Middle Initial)', value: `${userData?.last_name || ''}, ${userData?.first_name || ''} ${userData?.middle_initial || ''}` },
    { label: '2. SOCIAL SECURITY NUMBER', value: userData?.ssn_encrypted ? `XXX-XX-${userData.ssn_encrypted.slice(-4)}` : '' },
    { label: '3. DATE OF BIRTH', value: userData?.date_of_birth || '' },
    { label: '4. RETIRED GRADE/RANK', value: militaryService?.retired_rank || '' },
    { label: '5. BRANCH OF SERVICE', value: getBranchName(militaryService?.branch) },
    { label: '6. RETIREMENT DATE', value: militaryService?.retirement_date || '' },
    { label: '7. EMAIL ADDRESS', value: userData?.email || '' },
    { label: '8. TELEPHONE NUMBER', value: userData?.phone || '' },
    { label: '9. MAILING ADDRESS', value: `${userData?.address_line1 || ''} ${userData?.address_line2 || ''}, ${userData?.city || ''}, ${userData?.state || ''} ${userData?.zip_code || ''}` },
  ]

  for (const field of fields) {
    page.drawText(field.label, { x: 50, y: yPosition, size: 9, font: boldFont })
    page.drawText(field.value, { x: 250, y: yPosition, size: 9, font })
    yPosition -= 18
  }
  yPosition -= 20

  // Section 2 - VA Information
  page.drawText('SECTION II - VA DISABILITY INFORMATION', {
    x: 50,
    y: yPosition,
    size: 10,
    font: boldFont,
  })
  yPosition -= 20

  const vaFields = [
    { label: '10. VA FILE NUMBER', value: vaDisability?.va_file_number || '' },
    { label: '11. COMBINED VA RATING', value: vaDisability?.current_va_rating ? `${vaDisability.current_va_rating}%` : '' },
    { label: '12. VA DECISION DATE', value: vaDisability?.va_decision_date || '' },
  ]

  for (const field of vaFields) {
    page.drawText(field.label, { x: 50, y: yPosition, size: 9, font: boldFont })
    page.drawText(field.value, { x: 250, y: yPosition, size: 9, font })
    yPosition -= 18
  }
  yPosition -= 20

  // Section 3 - Disability Claims (may span multiple pages)
  page.drawText('SECTION III - COMBAT-RELATED DISABILITY CLAIMS', {
    x: 50,
    y: yPosition,
    size: 10,
    font: boldFont,
  })
  yPosition -= 25

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i]

    // Check if we need a new page
    if (yPosition < 150) {
      page = pdfDoc.addPage([612, 792])
      yPosition = height - 50
      page.drawText('DD FORM 2860 (Continued)', { x: 50, y: yPosition, size: 10, font: boldFont })
      yPosition -= 30
    }

    // Claim header
    page.drawText(`DISABILITY ${i + 1}`, { x: 50, y: yPosition, size: 9, font: boldFont })
    yPosition -= 15

    const claimFields = [
      { label: 'Disability Title:', value: claim.disability_title || '' },
      { label: 'Body Part Affected:', value: claim.body_part_affected || '' },
      { label: 'VA Disability Code:', value: claim.disability_code || '' },
      { label: 'Current Rating:', value: claim.current_rating_percentage ? `${claim.current_rating_percentage}%` : '' },
      { label: 'Combat-Related Code:', value: `${claim.combat_related_code || ''} - ${COMBAT_CODES[claim.combat_related_code as keyof typeof COMBAT_CODES] || ''}` },
      { label: 'Unit of Assignment:', value: claim.unit_of_assignment || '' },
      { label: 'Location of Injury:', value: claim.location_of_injury || '' },
      { label: 'Purple Heart:', value: claim.received_purple_heart ? 'Yes' : 'No' },
    ]

    for (const field of claimFields) {
      page.drawText(field.label, { x: 60, y: yPosition, size: 8, font: boldFont })
      page.drawText(field.value.substring(0, 60), { x: 180, y: yPosition, size: 8, font })
      yPosition -= 12
    }

    // Event description (truncated for form)
    page.drawText('Event Description:', { x: 60, y: yPosition, size: 8, font: boldFont })
    yPosition -= 12
    const description = claim.description_of_event || ''
    const truncatedDesc = description.substring(0, 200) + (description.length > 200 ? '...' : '')
    const words = truncatedDesc.split(' ')
    let line = ''
    for (const word of words) {
      if ((line + ' ' + word).length > 80) {
        page.drawText(line, { x: 60, y: yPosition, size: 8, font })
        yPosition -= 10
        line = word
      } else {
        line = line ? line + ' ' + word : word
      }
    }
    if (line) {
      page.drawText(line, { x: 60, y: yPosition, size: 8, font })
      yPosition -= 10
    }

    yPosition -= 15
  }

  // Signature section
  if (yPosition < 100) {
    page = pdfDoc.addPage([612, 792])
    yPosition = height - 50
  }

  yPosition -= 20
  page.drawText('SECTION IV - CERTIFICATION', { x: 50, y: yPosition, size: 10, font: boldFont })
  yPosition -= 20
  page.drawText('I certify that the information provided above is true and correct to the best of my knowledge.', { x: 50, y: yPosition, size: 9, font })
  yPosition -= 30
  page.drawText('SIGNATURE: _________________________________', { x: 50, y: yPosition, size: 9, font })
  page.drawText(`DATE: _____________`, { x: 350, y: yPosition, size: 9, font })
  yPosition -= 30
  page.drawText('PRINTED NAME: ' + `${userData?.first_name || ''} ${userData?.middle_initial || ''} ${userData?.last_name || ''}`.toUpperCase(), { x: 50, y: yPosition, size: 9, font })

  // Footer
  page.drawText('DD FORM 2860, NOV 2013', { x: 50, y: 30, size: 8, font })
  page.drawText('PREVIOUS EDITIONS ARE OBSOLETE', { x: 400, y: 30, size: 8, font })

  return pdfDoc.save()
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let db: Client | null = null

  try {
    const { userId, documentType } = await req.json() as GeneratePDFRequest

    if (!userId || !documentType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Connect to Google Cloud PostgreSQL
    db = await getDbClient()

    // Fetch user data from external PostgreSQL
    const personalInfoResult = await db.queryObject`
      SELECT * FROM personal_information WHERE user_id = ${userId}
    `
    const militaryServiceResult = await db.queryObject`
      SELECT * FROM military_service WHERE user_id = ${userId}
    `
    const vaDisabilityResult = await db.queryObject`
      SELECT * FROM va_disability_info WHERE user_id = ${userId}
    `
    const claimsResult = await db.queryObject`
      SELECT * FROM disability_claims WHERE user_id = ${userId}
    `

    const personalInfo = personalInfoResult.rows[0]
    const militaryService = militaryServiceResult.rows[0]
    const vaDisability = vaDisabilityResult.rows[0]
    const claims = claimsResult.rows || []

    let pdfBytes: Uint8Array

    if (documentType === 'dd2860') {
      pdfBytes = await generateDD2860(
        personalInfo,
        militaryService,
        vaDisability,
        claims
      )
    } else if (documentType === 'cover-letter') {
      const pdfDoc = await PDFDocument.create()
      pdfBytes = await generateCoverLetter(
        pdfDoc,
        personalInfo,
        militaryService,
        claims
      )
    } else if (documentType === 'package') {
      // For package, we'll generate DD2860 for now
      // In production, this would create a ZIP with all documents
      pdfBytes = await generateDD2860(
        personalInfo,
        militaryService,
        vaDisability,
        claims
      )
    } else {
      await db.end()
      return new Response(
        JSON.stringify({ error: 'Invalid document type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert to base64
    const base64Pdf = btoa(String.fromCharCode(...pdfBytes))

    // Create audit log entry
    await db.queryObject`
      INSERT INTO audit_log (user_id, action, resource_type, details, created_at)
      VALUES (${userId}, 'pdf_generated', 'document', ${JSON.stringify({ document_type: documentType })}, NOW())
    `

    await db.end()

    return new Response(
      JSON.stringify({ pdf: base64Pdf }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('PDF generation error:', error)
    if (db) {
      try {
        await db.end()
      } catch {
        // Ignore close errors
      }
    }
    return new Response(
      JSON.stringify({ error: 'Failed to generate PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
