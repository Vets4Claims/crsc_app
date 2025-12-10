import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { vaDisabilityInfoSchema, type VADisabilityInfoFormData } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2, Save } from 'lucide-react'

interface VADisabilityFormProps {
  defaultValues?: Partial<VADisabilityInfoFormData>
  onSubmit: (data: VADisabilityInfoFormData) => Promise<void>
  isLoading?: boolean
}

export default function VADisabilityForm({
  defaultValues,
  onSubmit,
  isLoading = false,
}: VADisabilityFormProps) {
  const form = useForm<VADisabilityInfoFormData>({
    resolver: zodResolver(vaDisabilityInfoSchema),
    defaultValues: {
      vaFileNumber: '',
      currentVaRating: 10,
      vaDecisionDate: '',
      hasVaWaiver: false,
      receivesCrdp: false,
      ...defaultValues,
    },
  })

  const handleSubmit = async (data: VADisabilityInfoFormData) => {
    await onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* VA File Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">VA File Information</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="vaFileNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VA File Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your VA file number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Found on your VA rating decision letter
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vaDecisionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VA Decision Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    Date of your most recent VA decision
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Rating Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Rating Information</h3>
          <FormField
            control={form.control}
            name="currentVaRating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Combined VA Rating (%) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={10}
                    max={100}
                    step={10}
                    placeholder="e.g., 70"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                  />
                </FormControl>
                <FormDescription>
                  Your current combined VA disability rating (10-100%)
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
            name="hasVaWaiver"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>VA Waiver</FormLabel>
                  <FormDescription>
                    Do you currently have a VA disability waiver in place?
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="receivesCrdp"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>CRDP Recipient</FormLabel>
                  <FormDescription>
                    Are you currently receiving Concurrent Retirement and Disability Pay (CRDP)?
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Information
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
