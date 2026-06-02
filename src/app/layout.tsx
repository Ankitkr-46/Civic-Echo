import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicEcho | AI-Powered Integrated Public Complaint Platform",
  description: "Report road issues, water leaks, power disruptions, sanitation, and safety issues. Features real-time voice speech-to-text dictation, automatic AI classification, coordinates mapping, translation, and dispatcher command logs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
