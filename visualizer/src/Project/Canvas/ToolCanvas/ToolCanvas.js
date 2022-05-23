import { useSelector } from '@xstate/react';
import React from 'react';
import { useFlood, useLabelMode, useSegment } from '../../ProjectContext';
import BrushCanvas from './BrushCanvas';
import OutlineCellCanvas from './OutlineCellCanvas';
import ThresholdCanvas from './ThresholdCanvas';
import WatershedCanvas from './WatershedCanvas';

function ToolCanvas({ setCanvases }) {
  const segment = useSegment();

  const tool = useSelector(segment, (state) => state.context.tool);

  const labelMode = useLabelMode();
  const mode = useSelector(labelMode, (state) =>
    state.matches('segment') ? 'segment' : state.matches('editLineage') ? 'track' : false
  );

  const flood = useFlood();
  const cell = useSelector(flood, (state) => state.context.floodedCell);

  if (mode === 'track') {
    return null;
  }

  return (
    <>
      {tool === 'brush' && <BrushCanvas setCanvases={setCanvases} />}
      {tool === 'threshold' && <ThresholdCanvas setCanvases={setCanvases} />}
      {tool === 'watershed' && <WatershedCanvas setCanvases={setCanvases} />}
      {tool === 'flood' && <OutlineCellCanvas setCanvases={setCanvases} cell={cell} />}
    </>
  );
}

export default ToolCanvas;
