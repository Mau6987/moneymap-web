/** Un segmento del anillo: su color y su parte (0 a 1). Solo dibuja. */
export interface DonutSegment {
  key: string;
  color: string;
  share: number;
}

/**
 * El anillo de Money Flow: un arco por grupo, tan largo como su parte del
 * ingreso. Los montos se leen al lado, nunca aquí.
 */
export function FlowDonut({
  segments,
  label,
  children,
}: {
  segments: DonutSegment[];
  label: string;
  children?: React.ReactNode;
}) {
  const radius = 52;
  const length = 2 * Math.PI * radius;
  const gap = segments.filter((s) => s.share > 0).length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <div className="relative grid size-[200px] shrink-0 place-items-center">
      <svg
        viewBox="0 0 120 120"
        className="absolute inset-0 -rotate-90"
        role="img"
        aria-label={label}
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="14"
          className="stroke-[var(--mm-well)]"
        />
        {segments.map((s) => {
          if (s.share <= 0) return null;
          const dash = Math.max(1, s.share * length - gap);
          const circle = (
            <circle
              key={s.key}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="14"
              stroke={s.color}
              strokeDasharray={`${dash.toFixed(2)} ${length.toFixed(2)}`}
              strokeDashoffset={(-offset).toFixed(2)}
            />
          );
          offset += s.share * length;
          return circle;
        })}
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}
