/** Fábrica pequena pra editar uma lista dinâmica (experiências, projetos,
 * formação etc) de forma imutável, reaproveitada nas seções do Editor do
 * Banco e no formulário de edição de currículo. */
export function makeListEditor<T>(items: T[], setItems: (items: T[]) => void) {
  return {
    items,
    updateAt(idx: number, patch: Partial<T>) {
      const next = items.slice();
      next[idx] = { ...next[idx], ...patch };
      setItems(next);
    },
    removeAt(idx: number) {
      const next = items.slice();
      next.splice(idx, 1);
      setItems(next);
    },
    add(blank: T) {
      setItems([...items, blank]);
    }
  };
}
