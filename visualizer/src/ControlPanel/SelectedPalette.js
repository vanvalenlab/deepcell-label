import React from 'react';
import { useSelector } from '@xstate/react';
import { makeStyles } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import SubdirectoryArrowLeftIcon from '@material-ui/icons/SubdirectoryArrowLeft';
import SubdirectoryArrowRightIcon from '@material-ui/icons/SubdirectoryArrowRight';

import { useToolbar } from '../ServiceContext';


const useStyles = makeStyles(theme => ({
  palette: {
    position: 'relative',
    margin: theme.spacing(1),
  },
  foreground: {
    position: 'absolute',
    zIndex: 1,
    top: '0px',
    left: '0px',
    display: 'block',
    width: '60px',
    height: '60px',
    border: '5px solid #DDDDDD',
  },
  background: {
    position: 'absolute',
    top: '30px',
    left: '30px',
    display: 'block',
    width: '60px',
    height: '60px',
    border: '5px solid #DD0000',
  },
  swap: {
    position: 'absolute',
    left: '60px',
    top: '-5px',
  },
  leftArrow: {
    transform: 'rotate(-90deg)',
  },
  rightArrow: {
    position: 'absolute',
    transform: 'rotate(180deg)',
    top: '8px',
    left: '8px',
  },
}));

export function SwapButton() {
  const styles = useStyles();

  const toolbar = useToolbar();
  const { send } = toolbar;
  const foreground = useSelector(toolbar, state => state.context.foreground);
  const background = useSelector(toolbar, state => state.context.background);

  const handleClick = () => {
    send('FOREGROUND', { foreground: background });
    send('BACKGROUND', { background: foreground });
  };

  return (
    <Tooltip title='Press X to swap.'>
      <IconButton
        className={styles.swap}
        color="primary"
        onClick={handleClick}
      >
        <SubdirectoryArrowLeftIcon className={styles.leftArrow} />
        <SubdirectoryArrowRightIcon className={styles.rightArrow} />
      </IconButton>
    </Tooltip>
  );

}

export default function SelectedPalette() {
  const toolbar = useToolbar();
  const foreground = useSelector(toolbar, state => state.context.foreground);
  const background = useSelector(toolbar, state => state.context.background);

  const styles = useStyles();

  return (
    <Box className={styles.palette}>
      <Box
        component='rect' 
        className={styles.foreground}
        style={{ background: foreground === 0 ? 'black' : 'white' }}
      />
      <Box
        component='rect' 
        className={styles.background}
        style={{ background: background === 0 ? 'black' : 'white' }}
      />
      <SwapButton />
    </Box>
  );
}
