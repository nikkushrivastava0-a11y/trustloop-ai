import type { Metadata } from "next";
import { Provider } from "@/components/provider";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "TrustLoop AI · Campus possibilities",
    template: "%s · TrustLoop AI",
  },
  description: "Discover, book and share campus resources with confidence.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
