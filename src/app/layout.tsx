import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NIET Dissertation Management System',
  description: 'Enterprise M.Tech Dissertation Tracking, Screening, and Defense System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
