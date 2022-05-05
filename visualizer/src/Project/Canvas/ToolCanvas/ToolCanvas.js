import { useSelector } from '@xstate/react';
import React from 'react';
import { useSegment } from '../../ProjectContext';
import BrushCanvas from './BrushCanvas';
import ThresholdCanvas from './ThresholdCanvas';

function ToolCanvas({ setCanvases }) {
  const segment = useSegment();

  const tool = useSelector(segment, (state) => state.context.tool);

  return (
    <>
      {tool === 'brush' && <BrushCanvas setCanvases={setCanvases} />}
      {tool === 'threshold' && <ThresholdCanvas setCanvases={setCanvases} />}
    </>
  );
}

export default ToolCanvas;
