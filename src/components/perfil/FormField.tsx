import type { ChangeEvent, ReactNode } from "react";

const fieldBaseClass =
  "w-full rounded-md border bg-military px-3 py-2 text-sm text-on-military placeholder:text-on-military-muted/70 focus:outline-none focus:ring-2 focus:ring-salmon";

export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
  placeholder?: string;
  disabled?: boolean;
}): ReactNode {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-on-military-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`${fieldBaseClass} ${error ? "border-value-negative" : "border-panel-border"} disabled:cursor-not-allowed disabled:opacity-60`}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-value-negative">
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  placeholder?: string;
  children: ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-on-military-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`${fieldBaseClass} ${error ? "border-value-negative" : "border-panel-border"}`}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {children}
      </select>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-value-negative">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextareaField({
  id,
  label,
  value,
  onChange,
  error,
  rows = 5,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  rows?: number;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-on-military-muted">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`${fieldBaseClass} resize-y ${error ? "border-value-negative" : "border-panel-border"}`}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-value-negative">
          {error}
        </p>
      )}
    </div>
  );
}

export function ReadField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-on-military-muted">{label}</dt>
      <dd className={`mt-0.5 text-sm text-on-military ${mono ? "font-mono tabular-nums" : ""}`}>{value}</dd>
    </div>
  );
}
