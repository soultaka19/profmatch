interface Props {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}

const SEGMENTS = [
  { key: "w1" as const, color: "bg-indigo-500", label: "W1" },
  { key: "w2" as const, color: "bg-emerald-500", label: "W2" },
  { key: "w3" as const, color: "bg-amber-500", label: "W3" },
  { key: "w4" as const, color: "bg-rose-500", label: "W4" },
];

export function PonderationsBar({ w1, w2, w3, w4 }: Props) {
  const values: Record<"w1" | "w2" | "w3" | "w4", number> = { w1, w2, w3, w4 };
  return (
    <div className="space-y-1">
      <div className="flex h-2 w-40 overflow-hidden rounded-full bg-surface">
        {SEGMENTS.map((s) => (
          <div
            key={s.key}
            className={s.color}
            style={{ width: `${values[s.key] * 100}%` }}
            title={`${s.label} = ${(values[s.key] * 100).toFixed(1)} %`}
          />
        ))}
      </div>
      <div className="flex w-40 justify-between text-[10px] font-mono tabular-nums text-fg-muted">
        <span>{(w1 * 100).toFixed(0)}</span>
        <span>{(w2 * 100).toFixed(0)}</span>
        <span>{(w3 * 100).toFixed(0)}</span>
        <span>{(w4 * 100).toFixed(0)}</span>
      </div>
    </div>
  );
}
