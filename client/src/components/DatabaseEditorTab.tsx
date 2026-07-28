import { RotateCcw, Save, Upload } from 'lucide-react';
import { DATABASE_SECTIONS, useDatabaseEditor } from '../hooks/useDatabaseEditor';
import { Button } from './ui/Button';
import { StatusMessage } from './ui/StatusMessage';

/** Aba própria pra editar o banco de fatos do perfil — antes vivia espremida
 * como a coluna esquerda da tela "Currículo", disputando espaço com a prévia
 * e o formulário de geração. Aqui tem a largura toda pra respirar. */
export function DatabaseEditorTab() {
  const editor = useDatabaseEditor();
  const {
    db,
    setDb,
    activeSection,
    setActiveSection,
    reloadKey,
    status,
    error,
    saving,
    importStatus,
    importError,
    handleSave,
    handleDiscard,
    handleImportChange
  } = editor;

  if (!db) return null;

  const active = DATABASE_SECTIONS.find(s => s.key === activeSection) ?? DATABASE_SECTIONS[0];
  const ActiveComponent = active.Component;

  return (
    <div className="grid h-full grid-cols-1 overflow-hidden md:grid-cols-[280px_1fr]">
      <div className="flex h-full flex-col overflow-y-auto border-r border-border bg-white">
        <div className="border-b border-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <Button variant="primary" onClick={handleSave} disabled={saving} className="flex-1">
              <Save size={15} />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="secondary" onClick={handleDiscard} title="Descartar alterações">
              <RotateCcw size={15} />
            </Button>
            <label title="Importar currículo (PDF)" className="cursor-pointer">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent-dark transition-colors hover:bg-accent-soft-strong">
                <Upload size={15} />
              </span>
              <input type="file" accept="application/pdf" hidden onChange={handleImportChange} />
            </label>
          </div>
          <StatusMessage error={error}>{status}</StatusMessage>
          <StatusMessage error={importError}>{importStatus}</StatusMessage>
        </div>

        <nav className="flex flex-col gap-0.5 p-2">
          {DATABASE_SECTIONS.map(section => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold transition-colors duration-150 ${
                section.key === activeSection ? 'bg-accent-soft text-accent-dark' : 'text-ink-soft hover:bg-bg hover:text-ink'
              }`}
            >
              {section.label}
              {section.count && <span className="text-[11px] font-bold opacity-65">{section.count(db)}</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="h-full overflow-y-auto bg-bg p-8">
        <div className="mx-auto max-w-[760px]">
          <ActiveComponent key={`${activeSection}-${reloadKey}`} db={db} onChange={setDb} />
        </div>
      </div>
    </div>
  );
}
