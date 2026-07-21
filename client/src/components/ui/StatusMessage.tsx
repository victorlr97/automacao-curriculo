interface StatusMessageProps {
  children?: string;
  error?: boolean;
}

export function StatusMessage({ children, error = false }: StatusMessageProps) {
  if (!children) return <p className="min-h-[18px] text-sm" />;
  return <p className={`min-h-[18px] text-sm ${error ? 'font-semibold text-danger' : 'text-ink-soft'}`}>{children}</p>;
}
