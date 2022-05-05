import { Paper, Tab, Tabs } from '@mui/material';
import { useSelector } from '@xstate/react';
import { useLabelMode } from '../ProjectContext';

function LabelTabs() {
  const labelMode = useLabelMode();
  const value = useSelector(labelMode, (state) => {
    return state.matches('segment') ? 0 : state.matches('track') ? 1 : false;
  });
  const handleChange = (event, newValue) => {
    switch (newValue) {
      case 0:
        labelMode.send('SEGMENT');
        break;
      case 1:
        labelMode.send('TRACK');
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
      >
        <Tab label='Segment' />
        <Tab label='Track' />
      </Tabs>
    </Paper>
  );
}

export default LabelTabs;
