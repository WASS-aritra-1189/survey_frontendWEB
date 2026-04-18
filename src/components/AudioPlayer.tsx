import { useAudioBlobUrl } from "@/hooks/useAudioBlobUrl";

interface AudioPlayerProps {
  src: string;
  className?: string;
}

export function AudioPlayer({ src, className }: AudioPlayerProps) {
  const blobUrl = useAudioBlobUrl(src);
  if (!blobUrl) return <span className="text-xs text-muted-foreground">Loading...</span>;
  return (
    <audio controls className={className} src={blobUrl} />
  );
}
