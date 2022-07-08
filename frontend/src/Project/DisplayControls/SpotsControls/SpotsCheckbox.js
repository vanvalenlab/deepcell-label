import { FormControlLabel, FormGroup } from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import { useSelector } from '@xstate/react';
import { useSpots } from '../../ProjectContext';

function SpotsCheckbox() {
  const spots = useSpots();
  const isOn = useSelector(spots, (state) => state.context.showSpots);

  return (
    <FormGroup row>
      <FormControlLabel
        control={<Checkbox onChange={() => spots.send('TOGGLE_SHOW_SPOTS')} checked={isOn} />}
        label='Show Spots'
        labelPlacement='end'
      />
    </FormGroup>
  );
}

export default SpotsCheckbox;
