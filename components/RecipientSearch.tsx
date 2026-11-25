"use client";

import { useEffect, useId, useState, type ComponentPropsWithRef } from "react";
import { Input } from "@/components/ui/input";
import { searchTransferRecipients, type TransferRecipient } from "@/lib/actions/recipient.actions";

type RecipientInputProps = Omit<ComponentPropsWithRef<typeof Input>, "onSelect" | "value"> & {
  value: string;
  onSelectRecipient: (recipient: TransferRecipient) => void;
};

export default function RecipientSearch({ value, onSelectRecipient, onChange, onBlur, ...inputProps }: RecipientInputProps) {
  const id = useId();
  const term = value.trim();
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
    onSelectRecipient(recipient);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="relative min-w-0">
      <Input
        {...inputProps}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? `${id}-results` : undefined}
        aria-activedescendant={expanded && items[active] ? `${id}-option-${active}` : undefined}
        onChange={(event) => { onChange?.(event); setOpen(true); setActive(-1); }}
        onBlur={(event) => { onBlur?.(event); setOpen(false); setActive(-1); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { setOpen(false); setActive(-1); }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((index) => event.key === "ArrowDown" ? Math.min(index + 1, items.length - 1) : Math.max(index - 1, 0));
          }
          if (event.key === "Enter" && expanded && items[active]) {
            event.preventDefault();
            select(items[active]);
          }
        }}
      />
      {expanded && (
        <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-sm sm:absolute sm:inset-x-0 sm:z-20">
          <ul id={`${id}-results`} role="listbox" aria-label="Previous recipients">
            {items.map((recipient, index) => (
              <li
                key={recipient.code}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={index === active}
                className="cursor-pointer break-all rounded px-3 py-2 text-sm hover:bg-gray-100 aria-selected:bg-gray-100"
                onPointerMove={() => setActive(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => select(recipient)}
              >
                {recipient.email} <span className="text-gray-600">· Account ending {recipient.mask}</span>
              </li>
            ))}
          </ul>
          {!items.length && (
            <p role="status" className="px-3 py-2 text-sm text-gray-600">
              {result?.term !== term ? "Searching previous recipients…" : result.failed ? "Suggestions unavailable. You can still enter the details manually." : "No previous recipients match."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
