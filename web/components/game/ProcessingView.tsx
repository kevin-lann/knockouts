"use client"

export default function ProcessingView() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white text-xl">Processing answers...</p>
      </div>
    </div>
  )
}
