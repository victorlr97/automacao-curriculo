import { useProfile } from '../context/ProfileContext';
import { useGenerateResume } from '../hooks/useGenerateResume';
import { GeneratePanel } from './workspace/GeneratePanel';
import { LivePreviewColumn } from './workspace/LivePreviewColumn';

export function ResumeWorkspace() {
  const { currentProfileId } = useProfile();
  const generator = useGenerateResume(currentProfileId);

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_minmax(300px,380px)]">
      <LivePreviewColumn generator={generator} />
      <GeneratePanel generator={generator} />
    </div>
  );
}
