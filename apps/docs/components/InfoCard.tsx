export function InfoCard({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
