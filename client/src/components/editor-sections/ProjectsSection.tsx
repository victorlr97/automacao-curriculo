import type { ProfileDatabase, ProjectFact } from '../../types';
import { makeListEditor } from '../../listEditor';
import { slugify } from '../../utils';
import { Button } from '../ui/Button';
import { Card, Hint } from '../ui/Card';
import { CollapsibleEntry } from '../ui/CollapsibleEntry';
import { LinesField } from '../ui/LinesField';
import { StackField } from '../ui/StackField';
import { TextField } from '../ui/TextField';

interface SectionProps {
  db: ProfileDatabase;
  onChange: (db: ProfileDatabase) => void;
}

function blank(): ProjectFact {
  return { id: '', name: '', stack: [], facts: [] };
}

export function ProjectsSection({ db, onChange }: SectionProps) {
  const projects = makeListEditor(db.projects, next => onChange({ ...db, projects: next }));

  return (
    <Card title="Projetos">
      <Hint>
        Fatos brutos de cada projeto — um por linha. A IA escolhe quais projetos entram e reescreve a descrição final
        pra cada vaga.
      </Hint>
      {projects.items.map((proj, idx) => (
        <CollapsibleEntry
          key={idx}
          title={proj.name || `Projeto ${idx + 1}`}
          subtitle={proj.stack.join(', ')}
          onRemove={() => projects.removeAt(idx)}
        >
          <TextField
            label="Nome"
            value={proj.name}
            onChange={v => projects.updateAt(idx, { name: v, id: slugify(v) })}
          />
          <StackField label="Ferramentas / Tecnologias (separado por vírgula)" items={proj.stack} onChange={stack => projects.updateAt(idx, { stack })} />
          <LinesField label="Fatos (um por linha)" items={proj.facts} onChange={facts => projects.updateAt(idx, { facts })} />
        </CollapsibleEntry>
      ))}
      <Button variant="add" onClick={() => projects.add(blank())}>
        + Adicionar projeto
      </Button>
    </Card>
  );
}
