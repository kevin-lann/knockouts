import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "react-hot-toast"

export const metadata: Metadata = {
  title: "Knockouts!",
  description: "A real-time multiplayer trivia game",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <div
          className="fixed inset-0 -z-10 h-full w-full 
        bg-[linear-gradient(to_right,#93939340_2px,transparent_2px),linear-gradient(to_bottom,#93939340_2px,transparent_2px)] 
        bg-[size:40px_40px]"
        />
        <main className="relative">{children}</main>
        <Toaster position="top-center" toastOptions={{ className: 'border-2' }} />
      </body>
    </html>
  )
}
