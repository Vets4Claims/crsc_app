import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { militaryServiceSchema, type MilitaryServiceFormData } from '@/lib/validation'
import { MILITARY_BRANCHES, RETIREMENT_TYPES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Loader2, Save } from 'lucide-react'

interface MilitaryServiceFormProps {
  defaultValues?: Partial<MilitaryServiceFormData>
  onSubmit: (data: MilitaryServiceFormData) => Promise<void>
  isLoading?: boolean
}

export default function MilitaryServiceForm({
  defaultValues,
  onSubmit,
  isLoading = false,
}: MilitaryServiceFormProps) {
  const form = useForm<MilitaryServiceFormData>({
    resolver: zodResolver(militaryServiceSchema),
    defaultValues: {
      branch: '',
      serviceNumber: '',
      retiredRank: '',
      retirementDate: '',
      yearsOfService: undefined,
      retirementType: '',
      ...defaultValues,
    },
  })

  const handleSubmit = async (data: MilitaryServiceFormData) => {
    await onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Service Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Service Information</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="branch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch of Service *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MILITARY_BRANCHES.map((branch) => (
                        <SelectItem key={branch.value} value={branch.value}>
                          {branch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serviceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormDescription>
                    If different from SSN
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Retirement Details */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Retirement Details</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="retiredRank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retired Rank *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., E-7, O-4, Master Sergeant" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="retirementDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retirement Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="yearsOfService"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Service</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      placeholder="e.g., 20"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="retirementType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retirement Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RETIREMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select how you qualified for military retirement
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
