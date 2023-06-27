import HighlightTwoToneIcon from '@mui/icons-material/HighlightTwoTone';
import { IconButton, Tooltip } from '@mui/material';
import { useSelector } from '@xstate/react';
import { bind, unbind } from 'mousetrap';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCellTypes, useEditCellTypes } from '../../../../ProjectContext';

function HighlightMultiLabel() {
  const editCellTypes = useEditCellTypes();
  const cellTypes = useCellTypes();
  const feature = useSelector(cellTypes, (state) => state.context.feature);
  const cellTypesCurrent = useSelector(cellTypes, (state) => state.context.cellTypes).filter(
    (cellType) => cellType.feature === feature
  );
  const multiSelected = useSelector(editCellTypes, (state) => state.context.multiSelected);
  const [highlighting, setHighlighting] = useState(multiSelected.length > 0 ? true : false);

  // Get cells with multiple labels
  const multiLabelCells = useMemo(() => {
    const cellTypeCounts = cellTypesCurrent.reduce((counts, cellType) => {
      cellType.cells.forEach((cell) => {
        counts[cell] = (counts[cell] || 0) + 1;
      });
      return counts;
    }, {});
    return Object.keys(cellTypeCounts)
      .filter((cell) => cellTypeCounts[cell] > 1)
      .map((cell) => parseInt(cell, 10));
  }, [cellTypesCurrent]);

  // Select cells with multiple labels or deselect all
  const handleHighlight = useCallback(() => {
    if (highlighting) {
      editCellTypes.send({ type: 'MULTISELECTION', selected: [] });
      setHighlighting(false);
    } else {
      editCellTypes.send({ type: 'MULTISELECTION', selected: multiLabelCells });
      setHighlighting(true);
    }
  }, [editCellTypes, highlighting, multiLabelCells]);

  useEffect(() => {
    bind('space', handleHighlight);
    return () => {
      unbind('space', handleHighlight);
    };
  }, [handleHighlight]);

  return (
    <Tooltip
      title={
        <span>
          Highlight multi-labels <kbd>Space</kbd>
        </span>
      }
      placement='top'
    >
      <IconButton onClick={handleHighlight} color='primary' sx={{ width: '100%', borderRadius: 1 }}>
        <HighlightTwoToneIcon />
      </IconButton>
    </Tooltip>
  );
}

export default HighlightMultiLabel;
