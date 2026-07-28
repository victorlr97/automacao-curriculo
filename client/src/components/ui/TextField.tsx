import type { LucideIcon } from 'lucide-react';

interface TextFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  icon?: LucideIcon;
}

const inputClasses =
  'w-full rounded-lg border border-border bg-white px-3.5 py-2.5 font-body text-sm text-ink placeholder:text-ink-faint transition-colors duration-150 hover:border-border-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15';

export function TextField({ label, value, onChange, type = 'text', placeholder, icon: Icon }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold tracking-wide text-ink-soft">{label}</span>
      <div className="relative">
        {Icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
            <Icon size={15} />
          </span>
        )}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className={`${inputClasses} ${Icon ? 'pl-10' : ''}`}
        />
      </div>
    </label>
  );
}

export { inputClasses };
