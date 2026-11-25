"use client";

import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchTransferRecipients, type TransferRecipient } from "@/lib/actions/recipient.actions";

export default function RecipientSearch({ onSelect }: { onSelect: (recipient: TransferRecipient) => void }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const term = query.trim();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<{ term: string; items: TransferRecipient[]; failed?: boolean }>();
  const expanded = open && term.length >= 2;
  const items = result?.term === term ? result.items : [];

  useEffect(() => {
    if (!expanded) return;
    let ignore = false;
    const timer = window.setTimeout(async () => {
      try {
        const items = await searchTransferRecipients(term);
        if (!ignore) setResult({ term, items });
      } catch {
        if (!ignore) setResult({ term, items: [], failed: true });
      }
    }, 300);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [expanded, term]);

  function select(recipient: TransferRecipient) {
    onSelect(recipient);
    setQuery("");
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="mb-5 space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">Find a previous recipient</label>
      <Input
        id={id}
        className="input-class"
        placeholder="Search by email or share code"
        value={query}
        maxLength={254}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? `${id}-results` : undefined}
        aria-activedescendant={expanded && items[active] ? `${id}-option-${active}` : undefined}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); setActive(-1); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { setOpen(false); setActive(-1); }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((index) => event.key === "ArrowDown" ? Math.min(index + 1, items.length - 1) : Math.max(index - 1, 0));
          }
          if (event.key === "Enter") {
            event.preventDefault();
            if (expanded && items[active]) select(items[active]);
          }
        }}
      />
      {expanded && (
        <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-sm">
          <ul id={`${id}-results`} role="listbox" aria-label="Previous recipients">
            {items.map((recipient, index) => (
              <li
                key={recipient.code}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={index === active}
                className="cursor-pointer break-all rounded px-3 py-2 text-sm hover:bg-gray-100 aria-selected:bg-gray-100"
                onPointerMove={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(recipient)}
              >
                {recipient.email} <span className="text-gray-600">· Account ending {recipient.mask}</span>
              </li>
            ))}
          </ul>
          {!items.length && (
            <p role="status" className="px-3 py-2 text-sm text-gray-600">
              {result?.term !== term ? "Searching…" : result.failed ? "Suggestions are unavailable. Enter the details below." : "No previous recipients match."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
