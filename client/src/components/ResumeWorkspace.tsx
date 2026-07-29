import { useGenerateResume } from '../hooks/useGenerateResume';
import { GeneratePanel } from './workspace/GeneratePanel';
import { LivePreviewColumn } from './workspace/LivePreviewColumn';

export function ResumeWorkspace() {
  const generator = useGenerateResume();

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr]">
      <GeneratePanel generator={generator} />
      <LivePreviewColumn generator={generator} />
    </div>
  );
}
