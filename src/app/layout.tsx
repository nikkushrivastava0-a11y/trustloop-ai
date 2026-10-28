import type { Metadata } from "next";
import { Provider } from "@/components/provider";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('trustloop.theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}})()`,
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Provider>{children}</Provider>
        <ThemeToggle />
      </body>
    </html>
  );
}
