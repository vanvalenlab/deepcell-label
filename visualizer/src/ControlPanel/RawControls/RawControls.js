import React from 'react';
import { useSelector } from '@xstate/react';
import Tooltip from '@material-ui/core/Tooltip';
import FormLabel from '@material-ui/core/FormLabel';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import Box from '@material-ui/core/Box';

import { useImage } from '../../ServiceContext';
import ColorModeToggle from './ColorModeToggle';
import GrayscaleControls from './GrayscaleControls';
import RGBControls from './RGBControls';

export const RawControls = () => {
  const image = useImage();
  const grayscale = useSelector(image, state => state.context.grayscale);

  return <>
    <Box display='flex' flexDirection='row' justifyContent='space-between'>
      <FormLabel component="legend">
        Channel Controls
      </FormLabel>
      <Tooltip title={<div>
        Move the sliders right for a darker image or left for a brighter image.
        </div>}
      >
        <HelpOutlineIcon color="action" fontSize="large" />
      </Tooltip>
    </Box>
    <ColorModeToggle />
    { grayscale ? <GrayscaleControls /> : <RGBControls /> }
  </>;
};

export default RawControls;
