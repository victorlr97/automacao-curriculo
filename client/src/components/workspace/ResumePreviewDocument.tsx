import type { ReactNode } from 'react';
import type { ResolvedResume } from '../../types';

const LABELS: Record<ResolvedResume['language'], Record<string, string>> = {
  pt: {
    objective: 'OBJETIVO PROFISSIONAL',
    experience: 'EXPERIÊNCIA',
    projects: 'PROJETOS',
    education: 'FORMAÇÃO',
    additionalEducation: 'FORMAÇÃO COMPLEMENTAR',
    skills: 'HABILIDADES',
    languages: 'IDIOMA',
    portfolio: 'PORTFÓLIO',
    portfolioIntro: 'Veja meu trabalho aqui:'
  },
  en: {
    objective: 'PROFESSIONAL OBJECTIVE',
    experience: 'EXPERIENCE',
    projects: 'PROJECTS',
    education: 'EDUCATION',
    additionalEducation: 'ADDITIONAL EDUCATION',
    skills: 'SKILLS',
    languages: 'LANGUAGES',
    portfolio: 'PORTFOLIO',
    portfolioIntro: 'View my work here:'
  }
};

function toUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

interface ResumePreviewDocumentProps {
  data: ResolvedResume;
  onSectionClick: (section: string) => void;
}

/** Prévia do currículo renderizada como documento web (mesma hierarquia
 * tipográfica do PDF real: PT Serif nos títulos, Lato no corpo, azul de
 * destaque nas seções), em vez de embutir o PDF via iframe/visualizador do
 * navegador. Cada seção é clicável e abre o editor daquele conteúdo. */
export function ResumePreviewDocument({ data, onSectionClick }: ResumePreviewDocumentProps) {
  const labels = LABELS[data.language] ?? LABELS.pt;
  const portfolioLinks: { label: string; href: string }[] = [];
  if (data.portfolio?.github) portfolioLinks.push({ label: 'GitHub', href: toUrl(data.portfolio.github) });
  if (data.portfolio?.behance) portfolioLinks.push({ label: 'Behance', href: toUrl(data.portfolio.behance) });

  return (
    <div className="mx-auto max-w-[820px] bg-white p-10 shadow-xs">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[32px] font-bold leading-none text-ink">{data.personal.name}</h1>
          <div className="mt-1 text-[13px] text-ink-faint">
            {data.personal.age}, {data.title}
          </div>
        </div>
        <div className="shrink-0 whitespace-nowrap text-right text-[12px] text-ink-2">
          {data.personal.location && <div className="mb-1">{data.personal.location}</div>}
          {data.personal.phone && <div className="mb-1 font-bold">{data.personal.phone}</div>}
          {data.personal.email && <div className="mb-1 text-accent">{data.personal.email}</div>}
          {data.personal.github && <div className="mb-1 text-accent">GitHub</div>}
          {data.personal.linkedin && <div className="mb-1 text-accent">LinkedIn</div>}
        </div>
      </div>

      <div className="grid grid-cols-[68%_32%] gap-6">
        <div>
          <Section label={labels.objective} onClick={() => onSectionClick('objective')}>
            <p className="text-[13px] leading-relaxed text-ink-2">{data.objective}</p>
          </Section>

          <Section label={labels.experience} onClick={() => onSectionClick('experience')}>
            {data.experience.map((exp, idx) => (
              <Entry
                key={idx}
                title={
                  <>
                    <span className="font-bold">
                      {exp.company}
                      {exp.location ? `, ${exp.location}` : ''}
                    </span>{' '}
                    — <span className="italic">{exp.role}</span>
                  </>
                }
                period={exp.period}
                description={exp.description}
              />
            ))}
          </Section>

          <Section label={labels.projects} onClick={() => onSectionClick('projects')}>
            {data.projects.map((proj, idx) => (
              <Entry
                key={idx}
                title={
                  <>
                    <span className="font-bold">{proj.name}</span> — <span className="italic">{proj.role}</span>
                  </>
                }
                stack={proj.stack?.join(', ')}
                description={proj.description}
              />
            ))}
          </Section>

          <Section label={labels.education} onClick={() => onSectionClick('education')}>
            {data.education.map((edu, idx) => (
              <Entry
                key={idx}
                title={
                  <>
                    <span className="font-bold">{edu.institution}</span> — <span className="italic">{edu.degree}</span>
                  </>
                }
                period={edu.period}
              />
            ))}
          </Section>

          {portfolioLinks.length > 0 && (
            <Section label={labels.portfolio}>
              <p className="mb-1.5 text-[13px] text-ink-2">{labels.portfolioIntro}</p>
              {portfolioLinks.map(link => (
                <div key={link.label} className="text-[13px] text-accent">
                  {link.label}
                </div>
              ))}
            </Section>
          )}
        </div>

        <div>
          <Section label={labels.skills} onClick={() => onSectionClick('skills')} first>
            {data.skills.map((skill, idx) => (
              <div key={idx} className="mb-2 text-[13px] text-ink-2">
                {skill}
              </div>
            ))}
          </Section>

          <Section label={labels.languages} onClick={() => onSectionClick('languages')}>
            {data.languages.map((lang, idx) => (
              <div key={idx} className="mb-2 text-[13px] text-ink-2">
                {lang.name} ({lang.level})
              </div>
            ))}
          </Section>

          {data.additionalEducation.length > 0 && (
            <Section label={labels.additionalEducation} onClick={() => onSectionClick('additionalEducation')}>
              {data.additionalEducation.map((ed, idx) => (
                <div key={idx} className="mb-2.5 font-display text-[12.5px] italic leading-snug text-ink-soft">
                  <span className="not-italic font-bold text-ink-2">{ed.institution}</span>
                  {ed.description ? ` — ${ed.description}` : ''}
                </div>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  onClick,
  first = false,
  children
}: {
  label: string;
  onClick?: () => void;
  first?: boolean;
  children: ReactNode;
}) {
  const clickable = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      className={`group rounded-lg px-3 -mx-3 py-1.5 ${first ? '' : 'mt-3'} ${
        clickable ? 'cursor-pointer transition-colors hover:bg-accent-soft' : ''
      }`}
    >
      <h2 className="mb-2 flex items-center justify-between font-body text-[11px] font-bold uppercase tracking-wide text-accent">
        {label}
        {clickable && (
          <span className="text-[10px] font-semibold normal-case tracking-normal text-accent opacity-0 transition-opacity group-hover:opacity-100">
            Editar
          </span>
        )}
      </h2>
      {children}
    </div>
  );
}

function Entry({
  title,
  period,
  stack,
  description
}: {
  title: ReactNode;
  period?: string;
  stack?: string;
  description?: string;
}) {
  return (
    <div className="mb-3.5">
      <div className="font-display text-[14px] text-ink">{title}</div>
      {period && <div className="mt-0.5 text-[11px] text-ink-faint">{period}</div>}
      {stack && <div className="mt-0.5 text-[12px] font-bold text-ink-2">{stack}.</div>}
      {description && <div className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{description}</div>}
    </div>
  );
}
