import { Spinner } from '@/components/common/Spinner'

export default function ChatLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Spinner size="lg" text="Loading chat assistant..." />
    </div>
  )
}
