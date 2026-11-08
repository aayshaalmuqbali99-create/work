export function SectionHeading({ title, subtitle, id }: { title: string; subtitle?: string; id?: string }) {
  return (
    <div className="mb-10 max-w-2xl">
      <h2 id={id} className="text-h2 font-bold tracking-tight text-navy">{title}</h2>
      {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
    </div>
  );
}
