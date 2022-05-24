import { Paper, Tab, Tabs } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useLabelMode } from '../ProjectContext';

function LabelTabs() {
  const labelMode = useLabelMode();
  const value = useSelector(labelMode, (state) => {
    return state.matches('segment')
      ? 0
      : state.matches('editCells')
      ? 1
      : state.matches('editLineage')
      ? 2
      : false;
  });
  const handleChange = (event, newValue) => {
    switch (newValue) {
      case 0:
        labelMode.send('SEGMENT');
        break;
      case 1:
        labelMode.send('EDIT_CELLS');
        break;
      case 2:
        labelMode.send('EDIT_LINEAGE');
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
        <Tab sx={{ p: 0.5, minHeight: 0 }} label='Lineage' />
      </Tabs>
    </Paper>
  );
}

export default LabelTabs;
