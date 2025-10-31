import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'YooSprint - Project Management',
  description: 'YooSprint Project Management Application built with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.className}>
      <head>
        <style>{`
          /* Custom Scrollbar Styles */
          ::-webkit-scrollbar {
            width: 12px;
            height: 12px;
          }

          ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
          }

          ::-webkit-scrollbar-thumb {
            background: #879BFF;
            border-radius: 10px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: #6b7fe6;
          }

          /* Firefox Scrollbar */
          * {
            scrollbar-width: thin;
            scrollbar-color: #879BFF #f1f1f1;
          }
        `}</style>
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
