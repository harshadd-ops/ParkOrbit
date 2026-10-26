import type { Metadata } from "next";
import { Sofia_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "sonner";

const sofiaSans = Sofia_Sans({
  // No fixed weights: loads the variable font so the design system's 450 body weight renders
  subsets: ["latin"],
  variable: "--font-sofia-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ParkOrbit — Park in someone's empty spot",
  description:
    "ParkOrbit turns idle driveways and society parking bays in Pune into bookable parking, by the hour, with a PIN at the gate.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sofiaSans.variable}>
      <body className="min-h-screen flex flex-col bg-[#F3F0EE] text-[#141413] font-sans antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#141413",
                color: "#F3F0EE",
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.12)",
                fontFamily: "var(--font-sofia-sans), sans-serif",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
