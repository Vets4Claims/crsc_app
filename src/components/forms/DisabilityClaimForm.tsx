import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { disabilityClaimSchema, type DisabilityClaimFormData } from '@/lib/validation'
import { COMBAT_RELATED_CODES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Loader2, Save, HelpCircle } from 'lucide-react'

interface DisabilityClaimFormProps {
  defaultValues?: Partial<DisabilityClaimFormData>
  onSubmit: (data: DisabilityClaimFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  isEditing?: boolean
}

export default function DisabilityClaimForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  isEditing = false,
}: DisabilityClaimFormProps) {
  const form = useForm<DisabilityClaimFormData>({
    resolver: zodResolver(disabilityClaimSchema),
    defaultValues: {
      disabilityTitle: '',
      disabilityCode: '',
      bodyPartAffected: '',
      dateAwardedByVa: '',
      initialRatingPercentage: 0,
      currentRatingPercentage: 0,
      combatRelatedCode: '',
      unitOfAssignment: '',
      locationOfInjury: '',
      descriptionOfEvent: '',
      receivedPurpleHeart: false,
      hasSecondaryConditions: false,
      ...defaultValues,
    },
  })

  const handleSubmit = async (data: DisabilityClaimFormData) => {
    await onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Disability Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Disability Information</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="disabilityTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disability Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., PTSD, Tinnitus, Back Injury" {...field} />
                  </FormControl>
                  <FormDescription>
                    As listed on your VA rating decision
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="disabilityCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VA Disability Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 5237" {...field} />
                  </FormControl>
                  <FormDescription>
                    From your VA code sheet
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="bodyPartAffected"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Body Part/System Affected *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Lower back, Left knee, Mental health" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Rating Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Rating Information</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="dateAwardedByVa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Awarded by VA *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="initialRatingPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Rating (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentRatingPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Rating (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Combat-Related Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-lg">Combat-Related Information</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>Select the code that best describes how your disability is combat-related.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <FormField
            control={form.control}
            name="combatRelatedCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Combat-Related Code *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select combat-related code" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(COMBAT_RELATED_CODES).map(([code, info]) => (
                      <SelectItem key={code} value={code}>
                        <span className="font-medium">{info.code}</span> - {info.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.value && COMBAT_RELATED_CODES[field.value as keyof typeof COMBAT_RELATED_CODES] && (
                  <FormDescription>
                    {COMBAT_RELATED_CODES[field.value as keyof typeof COMBAT_RELATED_CODES].description}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="unitOfAssignment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit of Assignment *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 1st Infantry Division" {...field} />
                  </FormControl>
                  <FormDescription>
                    Unit you were assigned to when injured
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="locationOfInjury"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location of Injury *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Baghdad, Iraq" {...field} />
                  </FormControl>
                  <FormDescription>
                    Location/area where the injury occurred
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Event Description */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Event Description</h3>
          <FormField
            control={form.control}
            name="descriptionOfEvent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description of Event *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide a detailed description of the event that caused or is related to your disability. Include dates, circumstances, and any relevant details..."
                    className="min-h-[150px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Minimum 50 characters. Be specific and detailed.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Additional Information</h3>
          <FormField
            control={form.control}
            name="receivedPurpleHeart"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Purple Heart Recipient</FormLabel>
                  <FormDescription>
                    Did you receive a Purple Heart for this injury?
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hasSecondaryConditions"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Secondary Conditions</FormLabel>
                  <FormDescription>
                    Does this disability have secondary conditions that should also be claimed?
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Update Claim' : 'Save Claim'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
