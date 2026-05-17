import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '중고 카메라 모아보기',
    description: '여러 중고 사이트의 카메라 매물을 한 곳에서',
    };

    export default function RootLayout({
      children,
      }: {
        children: React.ReactNode;
        }) {
          return (
              <html lang="ko">
                    <body>{children}</body>
                        </html>
                          );
                          }