import { useSelector } from '@xstate/react';
import React from 'react';
import { useLabelMode, useSegment } from '../../ProjectContext';
import BrushCanvas from './BrushCanvas';
import FloodCanvas from './FloodCanvas';
import ThresholdCanvas from './ThresholdCanvas';
import WatershedCanvas from './WatershedCanvas';

function ToolCanvas({ setCanvases }) {
  const segment = useSegment();

  const tool = useSelector(segment, (state) => state.context.tool);

  const labelMode = useLabelMode();
  const mode = useSelector(labelMode, (state) =>
    state.matches('segment') ? 'segment' : state.matches('editLineage') ? 'track' : false
  );

  if (mode === 'track') {
    return null;
  }

  return (
    <>
      {tool === 'brush' && <BrushCanvas setCanvases={setCanvases} />}
      {tool === 'threshold' && <ThresholdCanvas setCanvases={setCanvases} />}
      {tool === 'watershed' && <WatershedCanvas setCanvases={setCanvases} />}
      {tool === 'flood' && <FloodCanvas setCanvases={setCanvases} />}
    </>
  );
}

export default ToolCanvas;
