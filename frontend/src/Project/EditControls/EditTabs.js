import { Paper, Tab, Tabs } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useEffect } from 'react';
import { useLabelMode, useSpots } from '../ProjectContext';

const tabKeybinds = {
  segment: ['b', 'e', 'k', 'g', 'w', 'q'], // Remove 'm', 'x', and 't' so we can use it for cellTypes
  cells: ['Backspace', 'r', 's'],
};

function EditTabs() {
  const labelMode = useLabelMode();
  const value = useSelector(labelMode, (state) => {
    return state.matches('editSegment')
      ? 0
      : state.matches('editCells')
      ? 1
      : state.matches('editDivisions')
      ? 2
      : state.matches('editCellTypes')
      ? 3
      : state.matches('editSpots')
      ? 4
      : false;
  });
  const handleChange = (event, newValue) => {
    switch (newValue) {
      case 0:
        labelMode.send('EDIT_SEGMENT');
        break;
      case 1:
        labelMode.send('EDIT_CELLS');
        break;
      case 2:
        labelMode.send('EDIT_DIVISIONS');
        break;
      case 3:
        labelMode.send('EDIT_CELLTYPES');
        break;
      case 4:
        labelMode.send('EDIT_SPOTS');
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const listener = (event) => {
      if (tabKeybinds.segment.includes(event.key)) {
        labelMode.send('EDIT_SEGMENT');
      } else if (tabKeybinds.cells.includes(event.key)) {
        labelMode.send('EDIT_CELLS');
      }
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
    };
  }, [labelMode]);

  const spots = useSelector(useSpots(), (state) => state.context.spots);

  return (
    <Paper square>
      <Tabs
        orientation='vertical'
        value={value}
        indicatorColor='primary'
        textColor='primary'
        onChange={handleChange}
        variant='scrollable'
      >
        <Tab sx={{ p: 0.5, minHeight: 0 }} label='Segment' />
        <Tab sx={{ p: 0.5, minHeight: 0 }} label='Cells' />
        <Tab sx={{ p: 0.5, minHeight: 0 }} label='Divisions' />
        <Tab sx={{ p: 0.5, minHeight: 0 }} label='Cell Types' />
        {spots && <Tab sx={{ p: 0.5, minHeight: 0 }} label='Spots' />}
      </Tabs>
    </Paper>
  );
}

export default EditTabs;
