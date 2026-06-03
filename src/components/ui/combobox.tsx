import { useEffect, useRef, useState } from "react";

type Item = { value: string; label: string; sub?: string };

export function Combobox({
  value,
  onChange,
  onPick,
  items,
  placeholder,
  icon,
  inputClassName = "",
  containerClassName = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onPick?: (item: Item) => void;
  items: Item[];
  placeholder?: string;
  icon?: React.ReactNode;
  inputClassName?: string;
  containerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [items.length, value]);

  const visible = open && items.length > 0;

  const choose = (it: Item) => {
    onChange(it.value);
    onPick?.(it);
    setOpen(false);
  };

  return (
    <div ref={wrap} className={`relative ${containerClassName}`}>
      <div className="flex items-center gap-2">
        {icon}
        <input
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!visible) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(items.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(items[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={inputClassName}
        />
      </div>
      {visible && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-popover py-1 text-sm shadow-lg">
          {items.map((it, i) => (
            <li
              key={`${it.value}-${i}`}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(it);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 ${
                i === active ? "bg-accent/15 text-foreground" : "text-foreground/90"
              }`}
            >
              <span className="truncate">{it.label}</span>
              {it.sub && <span className="ml-2 shrink-0 text-xs text-muted-foreground">{it.sub}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
