import { makeStyles } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import FormLabel from '@material-ui/core/FormLabel';
import { useSelector } from '@xstate/react';
import React from 'react';
import { useRaw } from '../../../ProjectContext';
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
  title: {},
}));
export const RawControls = () => {
  const raw = useRaw();
  const isGrayscale = useSelector(raw, state => state.context.isGrayscale);

  const styles = useStyles();

  return (
    <>
      <Box className={styles.root}>
        <FormLabel component='legend' className={styles.title}>
          Channels
        </FormLabel>
        <ColorModeToggle />
      </Box>
      {isGrayscale ? <GrayscaleControls /> : <RGBControls />}
    </>
  );
};

export default RawControls;
