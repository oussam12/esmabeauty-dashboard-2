import "./globals.css";

export const metadata = {
  title: "Asmabeauty – Tableau de bord",
  description: "Ventes, dépenses & KPI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head />
      <body className="min-h-screen bg-gradient-to-b from-[#F5E8E7] via-[#F4E7E7] to-white text-zinc-900">
        <link rel="icon" href="/asmabeauty-logo.svg" />
        {children}
      </body>
    </html>
  );
}
