const ELEMENTS = ["Wood", "Fire", "Earth", "Metal", "Water"];

export function HighlightText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/\b(Wood|Fire|Earth|Metal|Water)\b/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (ELEMENTS.includes(part)) {
          return (
            <strong key={i} className="font-bold text-stone-900">
              {part}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
