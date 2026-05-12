import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Movéo — Turn your run into a story',
  description: 'Upload a GPX file and get an animated Instagram Story of your run.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
