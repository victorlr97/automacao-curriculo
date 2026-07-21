import { inputClasses } from './TextField';

interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

export function TextArea({ label, value, onChange, rows = 3, placeholder }: TextAreaProps) {
  const textarea = (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={`${inputClasses} resize-y`}
    />
  );

  if (!label) return textarea;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold tracking-wide text-ink-soft">{label}</span>
      {textarea}
    </label>
  );
}
