export const metadata = {
  title: "OCCO — Wallet Credit Lookup",
  description: "OCCO provides standardized credit scores for on-chain wallets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
