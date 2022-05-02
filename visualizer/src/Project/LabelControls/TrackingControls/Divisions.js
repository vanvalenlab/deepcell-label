import { Box } from '@mui/material';
import { useSelector } from '@xstate/react';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { useDivision, useLineage } from '../../ProjectContext';
import Division from './Division';
import DivisionFootprint from './Division/DivisionFootprint';

// Renders a hidden division timeline to size the real divisions
function DivisionsFootprint({ footprintRef }) {
  return (
    <Box ref={footprintRef} sx={{ display: 'flex', visibility: 'hidden', position: 'absolute' }}>
      <DivisionFootprint />
      <DivisionFootprint />
    </Box>
  );
}

function Divisions() {
  const lineage = useLineage();
  const label = useSelector(lineage, (state) => state.context.selected);
  const division = useDivision(label);

  const footprintRef = useRef();
  const [minWidth, setMinWidth] = useState(0);
  const [minHeight, setMinHeight] = useState(0);
  useLayoutEffect(() => {
    if (footprintRef.current) {
      setMinWidth(footprintRef.current.offsetWidth);
      setMinHeight(footprintRef.current.offsetHeight);
    }
  }, []);

  return (
    <>
      <DivisionsFootprint footprintRef={footprintRef} />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minWidth,
          minHeight,
        }}
      >
        {label !== 0 && (
          <>
            <Box
              sx={{ display: 'flex', justifyContent: 'left', alignItems: 'center', width: '50%' }}
            >
              {division.parent && <Division label={division.parent} />}
            </Box>
            <Box
              sx={{ display: 'flex', justifyContent: 'left', alignItems: 'center', width: '50%' }}
            >
              <Division label={label} />
            </Box>
          </>
        )}
      </Box>
    </>
  );
}

export default Divisions;
