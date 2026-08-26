// Next.js re-mounts template.tsx (unlike layout.tsx) on every navigation,
// so this gives every route -- including any page not individually
// wrapped in animate-fade-in -- a consistent fade-in transition on entry,
// without a routing/animation library.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
