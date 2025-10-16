import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Brooks E-Commerce",
  description: "Premium running shoes and athletic wear",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Brooks E-Commerce
              </Typography>
              <Box>
                <Button color="inherit" component={Link} href="/search">Search</Button>
                <Button color="inherit" component={Link} href="/my_cart">Cart</Button>
                <Button color="inherit" component={Link} href="/monitoring">Monitoring</Button>
              </Box>
            </Toolbar>
          </AppBar>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
