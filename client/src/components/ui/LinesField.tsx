import { useState } from 'react';
import { TextArea } from './TextArea';

interface LinesFieldProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  rows?: number;
}

/** Textarea onde cada linha vira um item de uma lista (fatos, habilidades).
 *
 * Mantém um buffer de texto local em vez de derivar o valor exibido
 * diretamente de `items`: como o array salvo é normalizado a cada mudança
 * (trim + remove linhas vazias), espelhar isso de volta no textarea a cada
 * tecla apagaria a linha em branco que o usuário acabou de criar com Enter,
 * travando a digitação. O reset pro valor "de fora" só acontece quando o
 * componente é remontado (troca de perfil, descartar alterações).
 */
export function LinesField({ label, items, onChange, rows = 6 }: LinesFieldProps) {
  const [raw, setRaw] = useState(() => items.join('\n'));

  return (
    <TextArea
      label={label}
      rows={rows}
      value={raw}
      onChange={value => {
        setRaw(value);
        onChange(value.split('\n').map(s => s.trim()).filter(Boolean));
      }}
    />
  );
}
