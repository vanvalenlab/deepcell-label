import { useSelector } from '@xstate/react';
import React from 'react';
import { useEditCells, useLabelMode, useSegment } from '../../ProjectContext';
import BrushCanvas from './BrushCanvas';
import FloodCanvas from './FloodCanvas';
import ReplaceCanvas from './ReplaceCanvas';
import SwapCanvas from './SwapCanvas';
import ThresholdCanvas from './ThresholdCanvas';
import WatershedCanvas from './WatershedCanvas';

function ToolCanvas({ setCanvases }) {
  const segment = useSegment();
  const segmentTool = useSelector(segment, (state) => state.context.tool);

  const editCells = useEditCells();
  const cellsTool = useSelector(editCells, (state) => state.context.tool);

  const labelMode = useLabelMode();
  const mode = useSelector(labelMode, (state) =>
    state.matches('segment') ? 'segment' : state.matches('editCells') ? 'cells' : false
  );

  switch (mode) {
    case 'segment':
      switch (segmentTool) {
        case 'brush':
          return <BrushCanvas setCanvases={setCanvases} />;
        case 'flood':
          return <FloodCanvas setCanvases={setCanvases} />;
        case 'threshold':
          return <ThresholdCanvas setCanvases={setCanvases} />;
        case 'watershed':
          return <WatershedCanvas setCanvases={setCanvases} />;
        default:
          return null;
      }
    case 'cells':
      switch (cellsTool) {
        case 'swap':
          return <SwapCanvas setCanvases={setCanvases} />;
        case 'replace':
          return <ReplaceCanvas setCanvases={setCanvases} />;
        default:
          return null;
      }
    default:
      return null;
  }
}

export default ToolCanvas;
