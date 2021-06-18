import { makeStyles } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import FormLabel from '@material-ui/core/FormLabel';
import Tooltip from '@material-ui/core/Tooltip';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import { useSelector } from '@xstate/react';
import React from 'react';

import { useImage } from '../../ServiceContext';
import ColorModeToggle from './ColorModeToggle';
import GrayscaleControls from './GrayscaleControls';
import RGBControls from './RGBControls';

const useStyles = makeStyles(theme => ({
  root: {
    // paddingTop: theme.spacing(1),
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
}));
export const RawControls = () => {
  const image = useImage();
  const grayscale = useSelector(image, state => state.context.grayscale);

  const styles = useStyles();

  return (
    <>
      <Box className={styles.root}>
        <FormLabel component='legend' className={styles.title}>
          Channels
        </FormLabel>
        <Tooltip title='Move sliders right to darken or left to brighten channels.'>
          <HelpOutlineIcon color='action' fontSize='large' />
        </Tooltip>
      </Box>
      <ColorModeToggle />
      {grayscale ? <GrayscaleControls /> : <RGBControls />}
    </>
  );
};

export default RawControls;
