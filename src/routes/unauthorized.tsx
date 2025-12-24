import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Lock } from 'lucide-react'

export const Route = createFileRoute('/unauthorized')({
  component: Unauthorized,
})

function Unauthorized() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 text-zinc-500 dark:text-zinc-400" />
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Unauthorized Access
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            You need a valid key to access this application.
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Please add <code className="bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded">?key=YOUR_KEY</code> to the URL
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
