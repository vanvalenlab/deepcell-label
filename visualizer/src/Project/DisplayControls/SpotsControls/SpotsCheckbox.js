import Checkbox from '@mui/material/Checkbox';
import { useSelector } from '@xstate/react';
import { useSpots } from '../../ProjectContext';

function SpotsCheckbox() {
  const spots = useSpots();
  const isOn = useSelector(spots, (state) => state.context.showSpots);

  return <Checkbox sx={{ p: 0 }} onChange={() => spots.send('TOGGLE_SHOW_SPOTS')} checked={isOn} />;
}

export default SpotsCheckbox;
