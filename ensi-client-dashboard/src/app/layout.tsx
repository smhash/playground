import "../app/globals.css";
import { ReactNode } from "react";
import { Box, CssBaseline } from "@mui/material";
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ensi Client Dashboard',
  description: 'Client dashboard for Ensi',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>{metadata.title as string}</title>
        <meta name="description" content={metadata.description as string} />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <CssBaseline />
        <Box display="flex">
          <Sidebar />
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f6f8fc' }}>
            <Topbar />
            <Box component="main" sx={{ flexGrow: 1, pl: 3, pt: 2 }}>
              {children}
            </Box>
          </Box>
        </Box>
      </body>
    </html>
  );
}
