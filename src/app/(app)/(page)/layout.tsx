// Areas, item details and settings read best at phone width, even on a computer.
export default function PageLayout({ children }: { children: React.ReactNode }) {
  return <div className="lg:max-w-2xl">{children}</div>;
}
