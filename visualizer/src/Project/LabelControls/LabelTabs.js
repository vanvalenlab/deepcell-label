import { Paper, Tab, Tabs } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useLabelMode } from '../ProjectContext';

function LabelTabs() {
  const labelMode = useLabelMode();
  const value = useSelector(labelMode, (state) => {
    return state.matches('editSegment')
      ? 0
      : state.matches('editCells')
      ? 1
      : state.matches('editDivisions')
      ? 2
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
      default:
        break;
    }
  };

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
      </Tabs>
    </Paper>
  );
}

export default LabelTabs;
