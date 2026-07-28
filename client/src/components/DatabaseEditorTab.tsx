import { RotateCcw, Save, Upload } from 'lucide-react';
import { DATABASE_SECTIONS, useDatabaseEditor } from '../hooks/useDatabaseEditor';
import { TONE_STYLES } from '../theme';
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
    <div className="grid h-full grid-cols-1 overflow-hidden md:grid-cols-[300px_1fr]">
      <div className="flex h-full flex-col overflow-y-auto border-r border-border bg-white">
        <div className="px-4 pb-1.5 pt-4">
          <p className="font-display text-xs font-bold uppercase tracking-wide text-ink-faint">Seções</p>
        </div>
        <nav className="flex flex-col gap-1 p-2 pt-1">
          {DATABASE_SECTIONS.map(section => {
            const isActive = section.key === activeSection;
            const count = section.count?.(db);
            const Icon = section.icon;
            const tone = TONE_STYLES[section.tone];
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={`flex items-center justify-between gap-2 border-l-[3px] py-4 pl-[10px] pr-3.5 text-left font-display text-[15px] font-bold transition-colors duration-150 ${
                  isActive
                    ? `${tone.navBorder} ${tone.navText}`
                    : 'border-transparent text-ink-soft hover:bg-bg hover:text-ink'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Icon size={18} className="shrink-0" strokeWidth={isActive ? 2.25 : 2} />
                  <span className="truncate">{section.label}</span>
                </span>
                {section.count && (
                  <span
                    className={`min-w-[1.5rem] rounded-full px-2.5 py-1 text-center text-xs font-bold ${
                      count! > 0 ? `${tone.badgeBg} ${tone.badgeText}` : 'border border-dashed border-border-strong text-ink-faint'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex h-full flex-col overflow-y-auto bg-bg">
        <div className="px-8 pb-8 pt-6">
          <div className="mx-auto max-w-[920px]">
            <ActiveComponent key={`${activeSection}-${reloadKey}`} db={db} onChange={setDb} />

            <div className="mt-3.5 flex flex-wrap items-center justify-end gap-3">
              <div className="inline-flex items-center gap-2.5 rounded-xl border border-border border-t-2 border-t-accent bg-white p-2.5 shadow-xs">
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
                <Button variant="secondary" onClick={handleDiscard} title="Descartar alterações">
                  <RotateCcw size={16} />
                </Button>
                <label title="Importar currículo (PDF)" className="cursor-pointer">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-dark transition-colors hover:bg-accent-soft-strong">
                    <Upload size={16} />
                  </span>
                  <input type="file" accept="application/pdf" hidden onChange={handleImportChange} />
                </label>
              </div>
              {(status || importStatus) && (
                <div className="min-w-0 text-right">
                  {status && <StatusMessage error={error}>{status}</StatusMessage>}
                  {importStatus && <StatusMessage error={importError}>{importStatus}</StatusMessage>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
