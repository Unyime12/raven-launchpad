import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "./contexts/WalletContext";
import WalletConnection from "./components/WalletConnection";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "RAVEN LAUNCHPAD",
  description: "token launchpad on Stellar Soroban",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Analytics />
      <body className="antialiased bg-[#0a0a0f]">
        <WalletProvider>
          <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#232328] backdrop-blur-xl border-b border-zinc-800/50">
              <div className="mx-5 flex items-center justify-between py-4">
                {/* Logo */}
                <div className="flex items-center gap-3">
  {/* Logo image */}
  <img
    src="/Raven-logo.png"
    alt="Raven"
    className="h-10 w-10 object-contain"
  />

  {/* Wordmark */}
  <span
    className="text-white text-xl tracking-wide"
    style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, letterSpacing: "0.08em" }}
  >
    RAVEN 
  </span>
</div>

                {/* Right side — network pill + wallet */}
                <div className="flex items-center gap-3">
 
                  <WalletConnection />
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-x-hidden">{children}</main>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
