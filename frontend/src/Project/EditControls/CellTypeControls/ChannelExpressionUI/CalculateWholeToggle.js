import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import { styled } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import { useSelector } from '@xstate/react';
import { useChannelExpression, useTraining } from '../../../ProjectContext';

const CustomWidthTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 100,
  },
});

function CalculateWholeToggle() {
  const channelExpression = useChannelExpression();
  const training = useTraining();
  const checked = useSelector(channelExpression, (state) => state.context.whole);

  const handleToggle = () => {
    channelExpression.send({ type: 'TOGGLE_WHOLE' });
    training.send({ type: 'TOGGLE_WHOLE' });
  };

  return (
    <FormGroup sx={{ display: 'inline' }}>
      <CustomWidthTooltip
        title={'If on, different cells across frames should not share cell IDs!'}
        placement='right'
      >
        <FormControlLabel
          sx={{ paddingRight: 1 }}
          control={<Switch checked={checked} onChange={handleToggle} />}
          label='All Frames'
          labelPlacement='start'
        />
      </CustomWidthTooltip>
    </FormGroup>
  );
}

export default CalculateWholeToggle;
