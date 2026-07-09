import type { Metadata } from "next"
import type { ReactNode } from "react"

import { Providers } from "@/components/providers"
import "@/app/globals.css"

export const metadata: Metadata = {
  title: "SupaTube",
  description: "SupaTube",
}

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body>
      <Providers>{children}</Providers>
    </body>
  </html>
)

export default RootLayout
