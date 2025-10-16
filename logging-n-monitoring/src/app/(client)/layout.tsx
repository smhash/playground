'use client';
import { UserProvider } from '@/auth/UserProvider';
import ClientLogForwarder from '@/components/ClientLogForwarder';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <ClientLogForwarder>
        {children}
      </ClientLogForwarder>
    </UserProvider>
  );
} 