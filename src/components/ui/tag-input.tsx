import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

export function TagInput({
  tags,
  onChange,
  max = 4,
  placeholder = "Add a tag…",
  suggestions = [],
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  max?: number;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  const norm = (t: string) =>
    t
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 24);

  const addTag = (raw: string) => {
    const t = norm(raw);
    if (!t) return;
    if (tags.includes(t)) {
      setDraft("");
      return;
    }
    if (tags.length >= max) return;
    onChange([...tags, t]);
    setDraft("");
  };

  const remove = (t: string) => onChange(tags.filter((x) => x !== t));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (draft.trim()) {
        e.preventDefault();
        addTag(draft);
      }
    } else if (e.key === "Backspace" && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  const filtered = suggestions
    .filter((s) => !tags.includes(s) && (!draft || s.includes(norm(draft))))
    .slice(0, 6);

  const atMax = tags.length >= max;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 focus-within:border-primary">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground"
          >
            #{t}
            <button
              type="button"
              onClick={() => remove(t)}
              className="rounded-full p-0.5 hover:bg-foreground/10"
              aria-label={`Remove tag ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {!atMax && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => draft.trim() && addTag(draft)}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="min-w-[8ch] flex-1 bg-transparent py-1 text-sm outline-none"
          />
        )}
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Press Enter or comma to add. {tags.length}/{max} used (free tier).</span>
      </div>
      {filtered.length > 0 && !atMax && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
