'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0d1730',
            color: '#e2e8f0',
            border: '1px solid #1e2a3a',
            fontSize: '14px',
          },
        }}
      />
    </SessionProvider>
  );
}
