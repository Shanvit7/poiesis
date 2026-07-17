import type { Metadata, Viewport } from "next"
import { Azeret_Mono, Oxanium } from "next/font/google"
import "@/app/globals.css"

// Oxanium — variable geometric, purpose-built for tech/gaming brands.
// Squared terminals, 200–800 weight range, commissioned feel without costume.
const sans = Oxanium({
  subsets: ["latin"],
  display: "swap",
  variable: "--ff-sans",
})

// Azeret Mono — quirky geometric mono with personality.
// Not IBM Plex Mono, not Space Mono. Labels, status chips, inline code.
const mono = Azeret_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--ff-mono",
})

export const viewport: Viewport = {
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL("https://shanvit7.github.io/poiesis"),
  title: "Poiesis — Point it at a tutorial. It codes. You understand.",
  description:
    "Poiesis watches a YouTube coding tutorial and builds the project chapter by chapter — narrating every decision so you actually understand what is being made and why.",
  keywords: [
    "AI coding tutor",
    "YouTube tutorial",
    "learn to code",
    "AI pair programmer",
    "coding education",
    "tutorial to codebase",
  ],
  openGraph: {
    title: "Poiesis — It codes. You understand.",
    description:
      "Point it at a YouTube tutorial. Poiesis builds the project chapter by chapter, narrating every decision in real time.",
    url: "https://shanvit7.github.io/poiesis",
    siteName: "Poiesis",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Poiesis — It codes. You understand.",
    description:
      "Point it at a YouTube tutorial. Poiesis builds the project chapter by chapter, narrating every decision in real time.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://shanvit7.github.io/poiesis" },
}

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" className={`${sans.variable} ${mono.variable}`}>
    <body className="bg-bg text-fg font-sans antialiased overflow-x-hidden">{children}</body>
  </html>
)

export default RootLayout
