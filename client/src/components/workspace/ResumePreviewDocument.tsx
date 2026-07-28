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

/** Prévia do currículo renderizada como documento web — mesmas cores,
 * tamanhos (convertidos de pt pra px) e espaçamentos exatos do template
 * usado pra gerar o PDF de verdade (scripts/render.js), pra bater 1:1 com o
 * arquivo final, não só "parecido". Cada seção é clicável e abre o editor
 * daquele conteúdo. */
export function ResumePreviewDocument({ data, onSectionClick }: ResumePreviewDocumentProps) {
  const labels = LABELS[data.language] ?? LABELS.pt;
  const portfolioLinks: { label: string; href: string }[] = [];
  if (data.portfolio?.github) portfolioLinks.push({ label: 'GitHub', href: toUrl(data.portfolio.github) });
  if (data.portfolio?.behance) portfolioLinks.push({ label: 'Behance', href: toUrl(data.portfolio.behance) });

  return (
    <div
      className="mx-auto max-w-[816px] bg-white py-[42px] px-[48px] text-[14px] shadow-xs"
      style={{ color: '#3a3a3a', lineHeight: 1.5 }}
    >
      <div className="mb-[22px] flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[45px] font-bold leading-none" style={{ color: '#111' }}>
            {data.personal.name}
          </h1>
          <div className="mt-[4px] text-[15px]" style={{ color: '#666' }}>
            {data.personal.age}, {data.title}
          </div>
        </div>
        <div className="shrink-0 whitespace-nowrap pt-[6px] text-right text-[13px]" style={{ color: '#333' }}>
          {data.personal.location && <div className="mb-[3px]">{data.personal.location}</div>}
          {data.personal.phone && (
            <div className="mb-[3px] font-bold">{data.personal.phone}</div>
          )}
          {data.personal.email && (
            <div className="mb-[3px]">
              <a href={`mailto:${data.personal.email}`} className="text-accent underline">
                {data.personal.email}
              </a>
            </div>
          )}
          {data.personal.github && (
            <div className="mb-[3px]">
              <a href={toUrl(data.personal.github)} className="text-accent underline">
                GitHub
              </a>
            </div>
          )}
          {data.personal.linkedin && (
            <div className="mb-[3px]">
              <a href={toUrl(data.personal.linkedin)} className="text-accent underline">
                LinkedIn
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[68%_32%] gap-x-6">
        <div>
          <Section label={labels.objective} onClick={() => onSectionClick('objective')} first>
            <p className="text-[14px]" style={{ color: '#444' }}>
              {data.objective}
            </p>
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
              <p className="mb-[6px] text-[14px]" style={{ color: '#444' }}>
                {labels.portfolioIntro}
              </p>
              <div>
                {portfolioLinks.map(link => (
                  <div key={link.label} className="mb-[3px] text-[14px]">
                    <a href={link.href} className="text-accent underline">
                      {link.label}
                    </a>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div>
          <Section label={labels.skills} onClick={() => onSectionClick('skills')} first>
            {data.skills.map((skill, idx) => (
              <div key={idx} className="mb-[9px] text-[13px]" style={{ color: '#333' }}>
                {skill}
              </div>
            ))}
          </Section>

          <Section label={labels.languages} onClick={() => onSectionClick('languages')}>
            {data.languages.map((lang, idx) => (
              <div key={idx} className="mb-[9px] text-[13px]" style={{ color: '#333' }}>
                {lang.name} ({lang.level})
              </div>
            ))}
          </Section>

          {data.additionalEducation.length > 0 && (
            <Section label={labels.additionalEducation} onClick={() => onSectionClick('additionalEducation')}>
              {data.additionalEducation.map((ed, idx) => (
                <div
                  key={idx}
                  className="mb-[10px] font-display text-[13px] italic leading-[1.4]"
                  style={{ color: '#555' }}
                >
                  <span className="not-italic font-bold" style={{ color: '#333' }}>
                    {ed.institution}
                  </span>
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
      className={`group -mx-2 rounded-lg px-2 py-1 ${first ? '' : 'mt-[20px]'} ${
        clickable ? 'cursor-pointer transition-colors hover:bg-accent-soft' : ''
      }`}
    >
      <h2 className="mb-[8px] flex items-center justify-between text-[14px] font-bold uppercase tracking-[0.06em] text-accent">
        {label}
        {clickable && (
          <span className="text-[11px] font-semibold normal-case tracking-normal text-accent opacity-0 transition-opacity group-hover:opacity-100">
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
    <div className="mb-[14px]">
      <div className="font-display text-[15px]" style={{ color: '#111' }}>
        {title}
      </div>
      {period && (
        <div className="mt-[1px] mb-[4px] text-[12px]" style={{ color: '#888' }}>
          {period}
        </div>
      )}
      {stack && (
        <div className="mb-[3px] text-[13px] font-bold" style={{ color: '#333' }}>
          {stack}.
        </div>
      )}
      {description && (
        <div className="text-[13px]" style={{ color: '#444' }}>
          {description}
        </div>
      )}
    </div>
  );
}
