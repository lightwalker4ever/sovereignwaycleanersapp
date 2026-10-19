export interface FilterChip {
  key: string;
  label: string;
  count: number;
}

/**
 * Pill filter buttons with a count. Selected chip is ink background +
 * white text; others are white with a border (design-handoff
 * DESIGN_HANDOFF.md's "Shared components" -> FilterChips).
 */
export function FilterChips({
  chips,
  selected,
  onSelect,
  label,
}: {
  chips: FilterChip[];
  selected: string;
  onSelect: (key: string) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const isSelected = chip.key === selected;
        return (
          <button
            key={chip.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(chip.key)}
            className={
              "h-[38px] cursor-pointer rounded-full px-3.5 text-[13px] font-bold " +
              (isSelected
                ? "border border-dash-ink bg-dash-ink text-white"
                : "border border-dash-border bg-dash-surface text-dash-ink")
            }
          >
            {chip.label} <span className="opacity-75">{chip.count}</span>
          </button>
        );
      })}
    </div>
  );
}
