// Re-mounts on every navigation, giving each route a soft entrance transition.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
