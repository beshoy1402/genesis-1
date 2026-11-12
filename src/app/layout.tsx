import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GENESIS INTERNATIONAL SCHOOL',
  description: 'A connected school community for learning, growth, and what comes next.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
