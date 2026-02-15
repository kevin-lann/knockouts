import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "react-hot-toast"

export const metadata: Metadata = {
  title: "Knockouts - Party Game",
  description: "A real-time multiplayer trivia game",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
