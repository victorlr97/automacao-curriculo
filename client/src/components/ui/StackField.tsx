import { useState } from 'react';
import { TextField } from './TextField';

interface StackFieldProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}

/** Campo de texto único onde os itens são separados por vírgula (stack de um
 * projeto). Mesmo raciocínio do `LinesField`: mantém um buffer local pra não
 * apagar a vírgula/espaço que o usuário acabou de digitar a cada tecla. */
export function StackField({ label, items, onChange }: StackFieldProps) {
  const [raw, setRaw] = useState(() => items.join(', '));

  return (
    <TextField
      label={label}
      value={raw}
      onChange={value => {
        setRaw(value);
        onChange(value.split(',').map(s => s.trim()).filter(Boolean));
      }}
    />
  );
}
