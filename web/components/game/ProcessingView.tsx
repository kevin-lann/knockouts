"use client"

import Card from "../general/Card"

export default function ProcessingView() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="text-center p-8 min-w-80">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[var(--foreground)] mx-auto mb-4"></div>
        <p className="text-xl">Processing answers...</p>
      </Card>
    </div>
  )
}
