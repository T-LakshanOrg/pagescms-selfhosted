"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { requireApiSuccess } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader, Pencil } from "lucide-react";

// Field types that can be edited straight from the collection list.
const inlineEditableTypes = ["number", "string"];

const isInlineEditableField = (field: Record<string, any> | undefined) =>
  !!field &&
  inlineEditableTypes.includes(field.type) &&
  !field.list &&
  !field.readonly &&
  !field.hidden;

// Returns a copy of `object` with the value at a dotted `path` replaced.
const setAtPath = (
  object: Record<string, any>,
  path: string,
  value: unknown,
): Record<string, any> => {
  const [key, ...rest] = path.split(".");
  if (rest.length === 0) return { ...object, [key]: value };
  const child = object?.[key];
  return {
    ...object,
    [key]: setAtPath(
      child && typeof child === "object" ? child : {},
      rest.join("."),
      value,
    ),
  };
};

// Turns the typed text into the value to save, or throws a readable error.
const parseInput = (input: string, field: Record<string, any>) => {
  const trimmed = input.trim();
  if (trimmed === "") {
    if (field.required) throw new Error(`${field.label ?? field.name} is required.`);
    return field.type === "number" ? "" : trimmed;
  }
  if (field.type !== "number") return trimmed;

  const value = Number(trimmed);
  if (!Number.isFinite(value)) throw new Error("Enter a number.");
  const min = field.options?.min;
  const max = field.options?.max;
  if (typeof min === "number" && value < min) throw new Error(`Minimum value is ${min}.`);
  if (typeof max === "number" && value > max) throw new Error(`Maximum value is ${max}.`);
  return value;
};

// A list cell that shows its value as text and turns into an input on click.
// Enter saves, Escape or clicking away cancels. Saving loads the latest copy of
// the entry, changes only this field, and saves the whole entry back.
function InlineEditCell({
  name,
  entryPath,
  fieldPath,
  field,
  value,
  children,
  onSaved,
}: {
  name: string;
  entryPath: string;
  fieldPath: string;
  field: Record<string, any>;
  value: unknown;
  children: ReactNode;
  onSaved: (entryPath: string, fieldPath: string, value: unknown, sha: string) => void;
}) {
  const { config } = useConfig();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  if (!config) return <>{children}</>;

  const startEditing = () => {
    setInput(value == null ? "" : String(value));
    setIsEditing(true);
  };

  const save = async () => {
    let nextValue: unknown;
    try {
      nextValue = parseInput(input, field);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid value.");
      return;
    }
    if (nextValue === value || String(nextValue) === String(value ?? "")) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    const savePromise = (async () => {
      const apiBase = `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}`;
      const entryResponse = await fetch(
        `${apiBase}/entries/${encodeURIComponent(entryPath)}?name=${encodeURIComponent(name)}`,
      );
      const entry = await requireApiSuccess<any>(entryResponse, "Failed to load entry");

      const saveResponse = await fetch(
        `${apiBase}/files/${encodeURIComponent(entryPath)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "content",
            name,
            content: setAtPath(entry.data.contentObject ?? {}, fieldPath, nextValue),
            sha: entry.data.sha,
          }),
        },
      );
      return requireApiSuccess<any>(saveResponse, "Failed to save file");
    })();

    toast.promise(savePromise, {
      loading: `Saving ${field.label ?? field.name}`,
      success: (response: any) => response.message,
      error: (error: unknown) => error instanceof Error ? error.message : "Failed to save file.",
    });

    try {
      const response = await savePromise;
      onSaved(entryPath, fieldPath, nextValue, response.data.sha);
      setIsEditing(false);
    } catch {
      // Keep the input open with the typed value so it can be fixed or cancelled.
      setTimeout(() => inputRef.current?.focus());
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        title={`Edit ${field.label ?? field.name}`}
        className="group/inline-edit flex items-center gap-x-1.5 max-w-[12rem] min-h-8 -mx-1.5 px-1.5 rounded-md text-left hover:bg-muted cursor-text"
      >
        <span className={cn("truncate", (value == null || value === "") && "text-muted-foreground")}>
          {value == null || value === "" ? "Add" : children}
        </span>
        <Pencil className="size-3 shrink-0 opacity-0 text-muted-foreground group-hover/inline-edit:opacity-100 group-focus-visible/inline-edit:opacity-100" />
      </button>
    );
  }

  return (
    <div className="relative w-32">
      <Input
        ref={inputRef}
        type={field.type === "number" ? "number" : "text"}
        inputMode={field.type === "number" ? "decimal" : undefined}
        min={field.options?.min}
        max={field.options?.max}
        step={field.type === "number" ? "any" : undefined}
        value={input}
        disabled={isSaving}
        aria-label={field.label ?? field.name}
        className="h-8 pr-7"
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void save();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setIsEditing(false);
          }
        }}
        onBlur={() => {
          if (!isSaving) setIsEditing(false);
        }}
      />
      {isSaving && (
        <Loader className="size-4 absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

export { InlineEditCell, isInlineEditableField };
