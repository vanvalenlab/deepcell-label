import { Paper, Tab, Tabs } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useLabelMode, useSpots } from '../ProjectContext';

function EditTabs() {
  const labelMode = useLabelMode();
  const value = useSelector(labelMode, (state) => {
    return state.matches('editSegment')
      ? 0
      : state.matches('editCells')
      ? 1
      : state.matches('editDivisions')
      ? 2
      : state.matches('editDivisions')
      ? 3
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
        labelMode.send('EDIT_SPOTS');
        break;
      default:
        break;
    }
  };

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
        {spots && <Tab sx={{ p: 0.5, minHeight: 0 }} label='Spots' />}
      </Tabs>
    </Paper>
  );
}

export default EditTabs;
