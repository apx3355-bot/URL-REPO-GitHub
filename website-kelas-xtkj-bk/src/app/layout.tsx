import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://website-kelas-xtkj-bk.vercel.app"),
  title: {
    default: "X TKJ BK — Kelas Teknik Komputer & Jaringan",
    template: "%s | X TKJ BK",
  },
  description:
    "Website resmi kelas X TKJ BK — Teknik Komputer dan Jaringan. Informasi kelas, anggota, galeri kegiatan, dan struktur organisasi.",
  keywords: ["X TKJ BK", "TKJ", "SMK", "Teknik Komputer Jaringan"],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "X TKJ BK",
    title: "X TKJ BK — Kelas Teknik Komputer & Jaringan",
    description:
      "Website resmi kelas X TKJ BK — Teknik Komputer dan Jaringan. Informasi kelas, anggota, galeri kegiatan, dan struktur organisasi.",
  },
};

// Cegah flash tema salah: set data-theme sebelum first paint.
const themeInitScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t="dark";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Langsung ke konten
        </a>
        {children}
      </body>
    </html>
  );
}
