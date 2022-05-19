import { Box, FormLabel } from '@mui/material';
import { useSelector } from '@xstate/react';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { useDivision, useEditing, useLineage } from '../../ProjectContext';
import Division from './Division';
import DivisionFootprint from './Division/DivisionFootprint';

// Render a hidden division timeline to size the real divisions
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
  const editing = useEditing();

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
      <Box>
        <Box display='flex' sx={{ width: '100%', justifyContent: 'space-between' }}>
          <FormLabel>Parent</FormLabel>
          <FormLabel>Daughters</FormLabel>
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minWidth,
            minHeight,
          }}
        >
          {division.parent && <Division label={division.parent} />}
          {(division.daughters.length > 0 || editing) && <Division label={label} />}
        </Box>
      </Box>
    </>
  );
}

export default Divisions;
