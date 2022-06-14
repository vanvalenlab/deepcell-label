import { Paper, Tab, Tabs } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useEffect } from 'react';
import { useLabelMode, useSpots } from '../ProjectContext';

const tabKeybinds = {
  display: ['c', 'f', 'y', 'i', '0', 'z', 'o'],
  segment: ['v', 'b', 'e', 'x', 'k', 'g', 't', 'w', 'm', 'q'],
  cells: ['Backspace', 'r', 's'],
};

function EditTabs() {
  const labelMode = useLabelMode();
  const value = useSelector(labelMode, (state) => {
    return state.matches('display')
      ? 0
      : state.matches('editSegment')
      ? 1
      : state.matches('editCells')
      ? 2
      : state.matches('editDivisions')
      ? 3
      : state.matches('editSpots')
      ? 4
      : false;
  });
  const handleChange = (event, newValue) => {
    switch (newValue) {
      case 0:
        labelMode.send('DISPLAY');
        break;
      case 1:
        labelMode.send('EDIT_SEGMENT');
        break;
      case 2:
        labelMode.send('EDIT_CELLS');
        break;
      case 3:
        labelMode.send('EDIT_DIVISIONS');
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
      if (tabKeybinds.display.includes(event.key)) {
        labelMode.send('DISPLAY');
      } else if (tabKeybinds.segment.includes(event.key)) {
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
        <Tab sx={{ p: 0.5, minHeight: 0 }} label='Display' />
        <Tab sx={{ p: 0.5, minHeight: 0 }} label='Segment' />
        <Tab sx={{ p: 0.5, minHeight: 0 }} label='Cells' />
        <Tab sx={{ p: 0.5, minHeight: 0 }} label='Divisions' />
        {spots && <Tab sx={{ p: 0.5, minHeight: 0 }} label='Spots' />}
      </Tabs>
    </Paper>
  );
}

export default EditTabs;
