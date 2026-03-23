import type { BaziResult } from "@/lib/bazi";

const ELEMENTS = [
  { key: "wood" as const, label: "Wood", color: "#16a34a", angle: -90 },
  { key: "fire" as const, label: "Fire", color: "#dc2626", angle: -18 },
  { key: "earth" as const, label: "Earth", color: "#d97706", angle: 54 },
  { key: "gold" as const, label: "Metal", color: "#94a3b8", angle: 126 },
  { key: "water" as const, label: "Water", color: "#2563eb", angle: 198 },
];

const RADIUS = 85;
const CENTER = 110;

export function FiveElementsChart({
  wuxing,
  dayMaster,
}: {
  wuxing: BaziResult["wuxing"];
  dayMaster: string;
}) {
  return (
    <div className="relative w-full max-w-[280px] aspect-square mx-auto">
      <svg viewBox="0 0 220 220" className="w-full h-full overflow-visible">
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        {ELEMENTS.map((el) => {
          const rad = (el.angle * Math.PI) / 180;
          const x = CENTER + RADIUS * Math.cos(rad);
          const y = CENTER + RADIUS * Math.sin(rad);
          const count = wuxing[el.key];
          const isDayMaster = el.label === dayMaster;
          return (
            <g key={el.key}>
              <circle
                cx={x}
                cy={y}
                r={24}
                fill="white"
                stroke={el.color}
                strokeWidth={isDayMaster ? 4 : 2}
                className="transition-all duration-500"
              />
              <text
                x={x}
                y={y}
                dy="-0.3em"
                textAnchor="middle"
                className="text-[10px] font-bold fill-stone-500 font-sans"
              >
                {el.label}
              </text>
              <text
                x={x}
                y={y}
                dy="1em"
                textAnchor="middle"
                className="text-[12px] font-bold fill-stone-900 font-mono"
              >
                {count}
              </text>
              {isDayMaster && (
                <g>
                  <rect
                    x={x - 16}
                    y={y + 30}
                    width="32"
                    height="12"
                    rx="6"
                    fill="#1c1917"
                  />
                  <text
                    x={x}
                    y={y + 38}
                    textAnchor="middle"
                    className="text-[8px] font-bold fill-white uppercase tracking-wider"
                  >
                    CORE
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
