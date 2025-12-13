import { useState, useCallback } from 'react'
import { validateFileUpload } from '@/lib/validation'
import { extractDocumentData, type ExtractedDocumentData } from '@/lib/api'
import { Upload, Loader2, FileText, AlertCircle, CheckCircle } from 'lucide-react'

// Document type labels for display
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  va_decision_letter: 'VA Decision Letter',
  va_code_sheet: 'VA Code Sheet',
  dd214: 'DD214',
}

export type DocumentType = 'va_decision_letter' | 'va_code_sheet' | 'dd214'

// Re-export for convenience
export type { ExtractedDocumentData } from '@/lib/api'

interface ChatDropzoneProps {
  documentType: DocumentType
  userId: string
  onExtractionComplete: (data: ExtractedDocumentData, documentType: DocumentType) => void
  onError: (error: string) => void
  disabled?: boolean
}

type DropzoneState = 'ready' | 'uploading' | 'extracting' | 'success' | 'error'

export default function ChatDropzone({
  documentType,
  userId,
  onExtractionComplete,
  onError,
  disabled = false,
}: ChatDropzoneProps) {
  const [state, setState] = useState<DropzoneState>('ready')
  const [isDragging, setIsDragging] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      // Reset state
      setErrorMessage(null)
      setFileName(file.name)

      // Validate file
      const validation = validateFileUpload(file)
      if (!validation.valid) {
        setErrorMessage(validation.error || 'Invalid file')
        setState('error')
        onError(validation.error || 'Invalid file')
        return
      }

      // Upload and extract
      setState('uploading')

      try {
        setState('extracting')
        const result = await extractDocumentData(userId, documentType, file)

        if (!result.success || !result.data) {
          const error = result.error || 'Failed to extract document data'
          setErrorMessage(error)
          setState('error')
          onError(error)
          return
        }

        setState('success')
        onExtractionComplete(result.data, documentType)
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to process document'
        setErrorMessage(error)
        setState('error')
        onError(error)
      }
    },
    [userId, documentType, onExtractionComplete, onError]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled || state === 'uploading' || state === 'extracting') return

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
    },
    [disabled, state, handleFile]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [handleFile]
  )

  const isProcessing = state === 'uploading' || state === 'extracting'
  const label = DOCUMENT_TYPE_LABELS[documentType] || documentType

  return (
    <div className="mt-3 mb-2">
      <div
        className={`
          border-2 border-dashed rounded-lg p-4 text-center transition-all
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isProcessing ? 'opacity-75 cursor-wait' : disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
          ${state === 'error' ? 'border-red-300 bg-red-50' : ''}
          ${state === 'success' ? 'border-green-300 bg-green-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id={`chat-dropzone-${documentType}`}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.tiff"
          onChange={handleInputChange}
          disabled={disabled || isProcessing}
        />
        <label
          htmlFor={`chat-dropzone-${documentType}`}
          className={`flex flex-col items-center gap-2 ${disabled || isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {state === 'uploading' && (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <div>
                <p className="font-medium text-sm">Uploading...</p>
                <p className="text-xs text-muted-foreground">{fileName}</p>
              </div>
            </>
          )}

          {state === 'extracting' && (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <div>
                <p className="font-medium text-sm">Extracting information...</p>
                <p className="text-xs text-muted-foreground">Analyzing your {label.toLowerCase()}</p>
              </div>
            </>
          )}

          {state === 'error' && (
            <>
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="font-medium text-sm text-red-700">Upload failed</p>
                <p className="text-xs text-red-600">{errorMessage}</p>
                <p className="text-xs text-muted-foreground mt-1">Click or drop to try again</p>
              </div>
            </>
          )}

          {state === 'success' && (
            <>
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium text-sm text-green-700">Document processed</p>
                <p className="text-xs text-muted-foreground">{fileName}</p>
              </div>
            </>
          )}

          {state === 'ready' && (
            <>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-muted-foreground" />
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Upload {label}</p>
                <p className="text-xs text-muted-foreground">
                  Drop file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF or image (max 10MB)
                </p>
              </div>
            </>
          )}
        </label>
      </div>
    </div>
  )
}
