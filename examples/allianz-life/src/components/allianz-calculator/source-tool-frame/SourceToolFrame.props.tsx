'use client';

import { useEffect, useRef, useState } from 'react';
import { observeSourceToolFrame } from './source-tool-frame';

export interface SourceToolFrameProps {
  preset: string;
  src: string;
  title: string;
  sourcePagePath: string;
}

/** Called only with the code-owned preset registry; native fields never supply a frame URL. */
export function SourceToolFrame({ preset, src, title, sourcePagePath }: SourceToolFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1000);
  const [status, setStatus] = useState<{ preset: string; available: boolean }>();
  const available = status?.preset === preset ? status.available : undefined;
  useEffect(() => {
    if (!frame.current) return;
    return observeSourceToolFrame(frame.current, sourcePagePath, preset,
      (next) => setHeight((previous) => Math.abs(previous - next) > 1 ? next : previous),
      (next) => setStatus({ preset, available: next }));
  }, [preset, sourcePagePath]);
  return <>
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <iframe key={preset} ref={frame} src={src} title={title}
        style={{ display: 'block', width: '100%', height, border: 0 }} />
    </div>
    {available === false && <p role="alert">The calculator could not be loaded. Please try again later.</p>}
  </>;
}
