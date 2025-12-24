import { useState, useCallback } from 'react'
import { createFileRoute, useRouter, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Plus, Pencil, Trash2, Clock, Copy, Check } from 'lucide-react'

const getTasks = createServerFn({
  method: 'GET',
}).handler(async () => {
  const tasks = await prisma.task.findMany({
    orderBy: {
      date: 'desc',
    },
  })
  return tasks
})

const createTask = createServerFn({
  method: 'POST',
})
  .inputValidator((d: {
    ticketNumber: string
    date: string
    description: string
    workedTime: string
    status: string
  }) => d)
  .handler(async ({ data }) => {
    const task = await prisma.task.create({
      data: {
        ticketNumber: data.ticketNumber,
        date: new Date(data.date),
        description: data.description,
        workedTime: data.workedTime,
        status: data.status,
      },
    })
    return task
  })

const updateTask = createServerFn({
  method: 'POST',
})
  .inputValidator((d: {
    id: number
    ticketNumber: string
    date: string
    description: string
    workedTime: string
    status: string
  }) => d)
  .handler(async ({ data }) => {
    const task = await prisma.task.update({
      where: { id: data.id },
      data: {
        ticketNumber: data.ticketNumber,
        date: new Date(data.date),
        description: data.description,
        workedTime: data.workedTime,
        status: data.status,
      },
    })
    return task
  })

const deleteTask = createServerFn({
  method: 'POST',
})
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await prisma.task.delete({
      where: { id: data.id },
    })
    return { success: true }
  })

const REQUIRED_KEY = 'mTaek8Iy0XobV5TmhiEYm1jIsxYHObOI'

export const Route = createFileRoute('/')({
  component: App,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      key: (search.key as string) || '',
    }
  },
  beforeLoad: ({ search }) => {
    // Check if the key is provided and correct
    if (search.key !== REQUIRED_KEY) {
      throw redirect({
        to: '/unauthorized',
      })
    }
  },
  loader: async () => {
    return await getTasks()
  },
})

type Task = {
  id: number
  ticketNumber: string
  date: Date | string
  description: string
  workedTime: string
  status: string
}

type TaskFormData = {
  ticketNumber: string
  date: string
  description: string
  workedTime: string
  status: string
}

function App() {
  const router = useRouter()
  const tasks = Route.useLoaderData()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [copiedDate, setCopiedDate] = useState<string | null>(null)
  const [formData, setFormData] = useState<TaskFormData>({
    ticketNumber: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    workedTime: '',
    status: 'Pending',
  })

  // Group tasks by date (needed for hooks below)
  const tasksByDate = (tasks as Task[]).reduce((acc: Record<string, Task[]>, task: Task) => {
    const date = new Date(task.date)
    const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD format
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(task)
    return acc
  }, {})

  // Copy tasks to clipboard
  const handleCopyTasks = useCallback(async (dateKey: string) => {
    try {
      const tasksForDate = tasksByDate[dateKey] || []
      const textToCopy = tasksForDate
        .map((task) => `${task.ticketNumber} - ${task.description}`)
        .join('\n')
      await navigator.clipboard.writeText(textToCopy)
      setCopiedDate(dateKey)
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedDate(null)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy tasks:', error)
    }
  }, [tasksByDate])

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('completed') || statusLower.includes('done')) {
      return 'default'
    }
    if (statusLower.includes('progress') || statusLower.includes('working')) {
      return 'secondary'
    }
    if (statusLower.includes('pending') || statusLower.includes('todo')) {
      return 'outline'
    }
    return 'default'
  }

  const handleOpenCreateDialog = useCallback(() => {
    setEditingTask(null)
    setFormData({
      ticketNumber: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      workedTime: '',
      status: 'Pending',
    })
    setIsDialogOpen(true)
  }, [])

  const handleOpenEditDialog = useCallback((task: Task) => {
    setEditingTask(task)
    const taskDate = new Date(task.date)
    setFormData({
      ticketNumber: task.ticketNumber,
      date: taskDate.toISOString().split('T')[0],
      description: task.description,
      workedTime: task.workedTime,
      status: task.status,
    })
    setIsDialogOpen(true)
  }, [])

  const handleOpenDeleteDialog = useCallback((task: Task) => {
    setTaskToDelete(task)
    setIsDeleteDialogOpen(true)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingTask) {
        await updateTask({
          data: {
            id: editingTask.id,
            ...formData,
          },
        })
      } else {
        await createTask({ data: formData })
      }
      setIsDialogOpen(false)
      router.invalidate()
    } catch (error) {
      console.error('Error saving task:', error)
    }
  }, [formData, editingTask, router])

  const handleDelete = useCallback(async () => {
    if (taskToDelete) {
      try {
        await deleteTask({ data: { id: taskToDelete.id } })
        setIsDeleteDialogOpen(false)
        setTaskToDelete(null)
        router.invalidate()
      } catch (error) {
        console.error('Error deleting task:', error)
      }
    }
  }, [taskToDelete, router])

  // Sort dates in descending order
  const sortedDates = Object.keys(tasksByDate).sort((a, b) => b.localeCompare(a))

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Parse workedTime string to total minutes
  const parseWorkedTime = (workedTime: string): number => {
    if (!workedTime) return 0
    
    let totalMinutes = 0
    
    // Match hours (e.g., "2h", "2.5h", "2 h")
    const hourRegex = /(\d+\.?\d*)\s*h/i
    const hourMatch = hourRegex.exec(workedTime)
    if (hourMatch) {
      totalMinutes += Number.parseFloat(hourMatch[1]) * 60
    }
    
    // Match minutes (e.g., "30m", "30 m")
    const minuteRegex = /(\d+\.?\d*)\s*m/i
    const minuteMatch = minuteRegex.exec(workedTime)
    if (minuteMatch) {
      totalMinutes += Number.parseFloat(minuteMatch[1])
    }
    
    return totalMinutes
  }

  // Format minutes to readable string (e.g., "2h 30m")
  const formatTotalTime = (minutes: number): string => {
    if (minutes === 0) return '0m'
    
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    
    if (hours === 0) {
      return `${mins}m`
    } else if (mins === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${mins}m`
    }
  }

  // Calculate total worked time for a date
  const getTotalWorkedTime = (dateKey: string): string => {
    const tasksForDate = tasksByDate[dateKey] || []
    const totalMinutes = tasksForDate.reduce((sum, task) => {
      return sum + parseWorkedTime(task.workedTime)
    }, 0)
    return formatTotalTime(totalMinutes)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Daily Tasks Tracker
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Track your tasks grouped by date
            </p>
          </div>
          <Button onClick={handleOpenCreateDialog} size="lg">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>

        {sortedDates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-zinc-500 dark:text-zinc-400">
                No tasks found. Add some tasks to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((dateKey) => (
              <Card key={dateKey}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {formatDate(dateKey)}
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        <Clock className="h-4 w-4" />
                        <span>Total: {getTotalWorkedTime(dateKey)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyTasks(dateKey)}
                        className="h-8 gap-2"
                      >
                        {copiedDate === dateKey ? (
                          <>
                            <Check className="h-4 w-4" />
                            <span className="text-xs">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            <span className="text-xs">Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tasksByDate[dateKey].map((task) => (
                      <div
                        key={task.id}
                        className="border rounded-lg p-4 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {task.ticketNumber}
                              </span>
                              <Badge variant={getStatusVariant(task.status)}>
                                {task.status}
                              </Badge>
                            </div>
                            <p className="text-zinc-700 dark:text-zinc-300">
                              {task.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                {task.workedTime}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEditDialog(task)}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDeleteDialog(task)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </DialogTitle>
              <DialogDescription>
                {editingTask
                  ? 'Update the task details below.'
                  : 'Fill in the details to create a new task.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="ticketNumber"
                      className="text-sm font-medium leading-none"
                    >
                      Ticket Number
                    </label>
                    <Input
                      id="ticketNumber"
                      value={formData.ticketNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, ticketNumber: e.target.value })
                      }
                      required
                      placeholder="TICKET-123"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="date"
                      className="text-sm font-medium leading-none"
                    >
                      Date
                    </label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="description"
                    className="text-sm font-medium leading-none"
                  >
                    Description
                  </label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                    placeholder="Task description..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="workedTime"
                      className="text-sm font-medium leading-none"
                    >
                      Worked Time
                    </label>
                    <Input
                      id="workedTime"
                      value={formData.workedTime}
                      onChange={(e) =>
                        setFormData({ ...formData, workedTime: e.target.value })
                      }
                      required
                      placeholder="2h 30m"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="status"
                      className="text-sm font-medium leading-none"
                    >
                      Status
                    </label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTask ? 'Update Task' : 'Create Task'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Task</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete task{' '}
                <span className="font-semibold">{taskToDelete?.ticketNumber}</span>?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
