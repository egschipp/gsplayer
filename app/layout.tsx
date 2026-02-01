import type { ReactNode } from 'react';

export const metadata = {
  title: 'Georgies Spotify Player',
  description: 'Server-side Spotify client laag',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
