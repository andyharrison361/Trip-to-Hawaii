export function Steps({ current, total = 4 }: { current: number; total?: number }) {
  return (
    <div className="flex gap-1.5 pt-6" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < current ? "bg-sage" : "bg-line"}`} />
      ))}
    </div>
  );
}
