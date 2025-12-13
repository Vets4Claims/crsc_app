import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk@0.24.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type DocumentType = 'va_decision_letter' | 'va_code_sheet' | 'dd214'

interface ExtractRequest {
  userId: string
  documentType: DocumentType
  fileBase64: string
  mimeType: string
}

// Extraction prompts for each document type
const EXTRACTION_PROMPTS: Record<DocumentType, string> = {
  va_decision_letter: `You are analyzing a VA (Department of Veterans Affairs) disability rating decision letter.

Extract the following information and return it as a JSON object:

{
  "disabilities": [
    {
      "title": "The name/title of the disability as listed",
      "diagnosticCode": "The VA diagnostic code (e.g., 9411, 6260)",
      "percentage": The rating percentage as a number (e.g., 70, not "70%"),
      "effectiveDate": "The effective date in YYYY-MM-DD format if shown",
      "bodyPart": "The body part affected if mentioned"
    }
  ],
  "combinedRating": The combined/overall disability rating as a number,
  "decisionDate": "The date of the decision in YYYY-MM-DD format",
  "vaFileNumber": "The VA file number if shown"
}

Important:
- Extract ALL disabilities listed in the document
- Use null for any fields you cannot find
- For percentages, use numbers not strings (70 not "70%")
- For dates, use YYYY-MM-DD format
- Return ONLY the JSON object, no other text`,

  va_code_sheet: `You are analyzing a VA Code Sheet (Rating Code Sheet).

Extract the following information and return it as a JSON object:

{
  "disabilities": [
    {
      "diagnosticCode": "The diagnostic code (e.g., 9411)",
      "description": "The description of the condition",
      "percentage": The rating percentage as a number
    }
  ],
  "combinedRating": The combined rating percentage as a number
}

Important:
- Extract ALL conditions listed
- Use null for any fields you cannot find
- For percentages, use numbers not strings
- Return ONLY the JSON object, no other text`,

  dd214: `You are analyzing a DD214 (Certificate of Release or Discharge from Active Duty).

Extract the following information and return it as a JSON object:

{
  "branch": "The branch of service (Army, Navy, Air Force, Marine Corps, Coast Guard, Space Force)",
  "entryDate": "Date entered active duty in YYYY-MM-DD format",
  "separationDate": "Date of separation in YYYY-MM-DD format",
  "rank": "Pay grade and rank at separation",
  "yearsOfService": Total years of service as a number,
  "characterOfService": "Character of service (Honorable, General, etc.)"
}

Important:
- Use null for any fields you cannot find
- For dates, use YYYY-MM-DD format
- Return ONLY the JSON object, no other text`,
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, documentType, fileBase64, mimeType } = await req.json() as ExtractRequest

    // Validate required fields
    if (!userId || !documentType || !fileBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, documentType, fileBase64, mimeType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate document type
    if (!['va_decision_letter', 'va_code_sheet', 'dd214'].includes(documentType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid document type. Must be va_decision_letter, va_code_sheet, or dd214' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate mime type
    const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!supportedTypes.includes(mimeType)) {
      return new Response(
        JSON.stringify({ error: 'Unsupported file type. Must be PDF or image.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[extract-document] Processing ${documentType} for user ${userId}, mimeType: ${mimeType}`)

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    })

    // Determine media type for Claude
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    if (mimeType === 'application/pdf') {
      // For PDFs, we'll treat the base64 as-is and let Claude handle it
      // Claude's vision API can process PDFs directly when sent as base64
      mediaType = 'image/png' // Fallback, though we'll handle PDF specially
    } else {
      mediaType = mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    }

    // Get the extraction prompt for this document type
    const extractionPrompt = EXTRACTION_PROMPTS[documentType]

    // Call Claude with vision
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: fileBase64,
              },
            },
            {
              type: 'text',
              text: extractionPrompt,
            },
          ],
        },
      ],
    })

    // Extract the text response
    const textBlock = response.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return new Response(
        JSON.stringify({ error: 'No text response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the JSON response
    let extractedData: Record<string, unknown>
    try {
      // Try to extract JSON from the response (it might have extra text)
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      extractedData = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('[extract-document] Failed to parse response:', textBlock.text)
      return new Response(
        JSON.stringify({
          error: 'Failed to parse extracted data',
          rawResponse: textBlock.text
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[extract-document] Successfully extracted data for ${documentType}`)

    return new Response(
      JSON.stringify({
        success: true,
        documentType,
        data: extractedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[extract-document] Error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to extract document data'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
