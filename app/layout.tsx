import "./styles.css";

export const metadata = { title: "PairSync", description: "二人の共通の空き時間" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
