/** Empty component for syncing between machines. */

import { useSelector } from '@xstate/react';
import { useEffect } from 'react';
import { useImage, useLabeled, usePyodide, useRaw } from './ProjectContext';

function EventBus() {
  const pyodide = usePyodide();

  const raw = useRaw();
  const channel = useSelector(raw, state => state.context.channel);

  const image = useImage();
  const frame = useSelector(image, state => state.context.frame);

  const labeled = useLabeled();
  const feature = useSelector(labeled, state => state.context.feature);

  useEffect(() => pyodide.send({ type: 'FRAME', frame }), [pyodide, frame]);
  useEffect(() => pyodide.send({ type: 'CHANNEL', channel }), [pyodide, channel]);
  useEffect(() => pyodide.send({ type: 'FEATURE', feature }), [pyodide, feature]);

  return null;
}

export default EventBus;
