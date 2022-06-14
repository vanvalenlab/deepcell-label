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

function ToolCanvas({ setBitmaps }) {
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
          return <BrushCanvas setBitmaps={setBitmaps} />;
        case 'flood':
          return <FloodCanvas setBitmaps={setBitmaps} />;
        case 'threshold':
          return <ThresholdCanvas setBitmaps={setBitmaps} />;
        case 'watershed':
          return <WatershedCanvas setBitmaps={setBitmaps} />;
        default:
          return null;
      }
    case 'cells':
      switch (cellsTool) {
        case 'swap':
          return <SwapCanvas setBitmaps={setBitmaps} />;
        case 'replace':
          return <ReplaceCanvas setBitmaps={setBitmaps} />;
        default:
          return null;
      }
    case 'divisions':
      if (addingDaughter) {
        return <AddDaughterCanvas setBitmaps={setBitmaps} />;
      }
    default:
      return null;
  }
}

export default ToolCanvas;
