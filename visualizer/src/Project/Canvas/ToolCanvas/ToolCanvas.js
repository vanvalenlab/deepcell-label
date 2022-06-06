import { useSelector } from '@xstate/react';
import React from 'react';
import { useEditCells, useEditDivisions, useEditSegment, useLabelMode } from '../../ProjectContext';
import AddDaughterCanvas from './AddDaughterCanvas';
import BrushCanvas from './BrushCanvas';
import FloodCanvas from './FloodCanvas';
import ReplaceCanvas from './ReplaceCanvas';
import SwapCanvas from './SwapCanvas';
import ThresholdCanvas from './ThresholdCanvas';
import WatershedCanvas from './WatershedCanvas';

function ToolCanvas({ setCanvases }) {
  const editSegment = useEditSegment();
  const segmentTool = useSelector(editSegment, (state) => state.context.tool);

  const editCells = useEditCells();
  const cellsTool = useSelector(editCells, (state) => state.context.tool);

  const editDivisions = useEditDivisions();
  const addingDaughter = useSelector(editDivisions, (state) => state.matches('addingDaughter'));

  const labelMode = useLabelMode();
  const mode = useSelector(labelMode, (state) =>
    state.matches('editSegment')
      ? 'segment'
      : state.matches('editCells')
      ? 'cells'
      : state.matches('editDivisions')
      ? 'divisions'
      : false
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
    case 'divisions':
      if (addingDaughter) {
        return <AddDaughterCanvas setCanvases={setCanvases} />;
      }
    default:
      return null;
  }
}

export default ToolCanvas;
