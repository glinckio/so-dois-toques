/** As telas da área entram em cascata; as abas da área ficam paradas e a pílula desliza. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="cascata flex min-w-0 flex-col gap-6">{children}</div>;
}
