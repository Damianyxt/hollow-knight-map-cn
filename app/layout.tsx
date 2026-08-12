import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "空洞骑士地图",
  description: "空洞骑士互动攻略地图",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
