import { useSelector } from '@xstate/react';
import React from 'react';
import { useCanvas, useEditCells, useEditCellTypes, useEditDivisions, useEditSegment, useLabelMode } from '../../ProjectContext';
import AddDaughterCanvas from './AddDaughterCanvas';
import AddCellTypeCanvas from './AddCellTypeCanvas';
import BrushCanvas from './BrushCanvas';
import CellTypeCanvas from './CellTypeCanvas';
import CellTypeHovering from '../../EditControls/CellTypeControls/CellTypeUI/CellTypeHovering';
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

  const editCellTypes = useEditCellTypes();
  const addingCell = useSelector(editCellTypes, (state) => state.matches('addingCell'));

  const canvas = useCanvas();
  const x = useSelector(canvas, (state) => state.context.x);
  const y = useSelector(canvas, (state) => state.context.y);

  const labelMode = useLabelMode();
  const mode = useSelector(labelMode, (state) =>
    state.matches('editSegment')
      ? 'segment'
      : state.matches('editCells')
      ? 'cells'
      : state.matches('editDivisions')
      ? 'divisions'
      : state.matches('editCellTypes')
      ? 'cellTypes'
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
      return null;
    case 'cellTypes':
      if (addingCell) {
        return (
                <>
                  <CellTypeCanvas setBitmaps={setBitmaps} />
                  <AddCellTypeCanvas setBitmaps={setBitmaps} />
                </>
               );
      }
      return (
        <>
          <CellTypeCanvas setBitmaps={setBitmaps} />
          <div style={{ position: 'absolute', top: y, left: x, width: 50, pointerEvents: 'none' }} >
            <CellTypeHovering/>
          </div>
        </>
      )
    default:
      return null;
  }
}

export default ToolCanvas;
