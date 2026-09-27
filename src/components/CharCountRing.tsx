export default function CharCountRing({ current, max }: { current: number; max: number }) {
  const remaining = max - current;
  const size = 22;
  const stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(current / max, 1);
  const offset = circumference * (1 - pct);

  const color =
    remaining < 0 ? "var(--color-danger)" : remaining < 20 ? "#FFAD1F" : "var(--color-accent)";

  if (current === 0) return null;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.15s ease, stroke 0.15s ease" }}
        />
      </svg>
      {remaining < 20 && (
        <span
          className="absolute text-[10px] font-bold"
          style={{ color }}
        >
          {remaining}
        </span>
      )}
    </div>
  );
}
