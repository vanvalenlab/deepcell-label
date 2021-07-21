import { makeStyles } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import AddIcon from '@material-ui/icons/Add';
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos';
import ClearIcon from '@material-ui/icons/Clear';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import SubdirectoryArrowLeftIcon from '@material-ui/icons/SubdirectoryArrowLeft';
import SubdirectoryArrowRightIcon from '@material-ui/icons/SubdirectoryArrowRight';
import { useSelector } from '@xstate/react';
import React, { useState } from 'react';
import { useFeature, useLabeled, useSelect } from '../../ServiceContext';

const useStyles = makeStyles(theme => ({
  palette: {
    position: 'relative',
    margin: theme.spacing(1),
    height: '100px',
    width: '150px',
  },
  foreground: {
    position: 'absolute',
    zIndex: 1,
    top: '0px',
    left: '0px',
    width: '60px',
    height: '60px',
    border: '5px solid #DDDDDD',
  },
  background: {
    position: 'absolute',
    top: '30px',
    left: '30px',
    width: '60px',
    height: '60px',
    border: '5px solid #DD0000',
  },
  swapBox: {
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
  help: {
    position: 'absolute',
    right: '8px',
  },
  topLeft: {
    position: 'absolute',
    top: -5,
    left: -5,
  },
  topRight: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  bottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  bottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
}));

function SwapIcon() {
  const styles = useStyles();

  return (
    <>
      <SubdirectoryArrowLeftIcon className={styles.leftArrow} />
      <SubdirectoryArrowRightIcon className={styles.rightArrow} />
    </>
  );
}

export function SwapButton() {
  const select = useSelect();
  const { send } = select;
  const foreground = useSelector(select, state => state.context.foreground);
  const background = useSelector(select, state => state.context.background);

  const handleClick = () => {
    send('FOREGROUND', { foreground: background });
    send('BACKGROUND', { background: foreground });
  };

  const tooltipText = (
    <span>
      Switch (<kbd>X</kbd>)
    </span>
  );

  return (
    <Tooltip title={tooltipText}>
      <IconButton color='primary' onClick={handleClick}>
        <SwapIcon />
      </IconButton>
    </Tooltip>
  );
}

function ForegroundBox() {
  const select = useSelect();
  const { send } = select;
  const foreground = useSelector(select, state => state.context.foreground);

  const [showButtons, setShowButtons] = useState(false);
  const buttonColor = foreground === 0 ? 'secondary' : 'default';

  const styles = useStyles();

  const labeled = useLabeled();
  const featureIndex = useSelector(labeled, state => state.context.feature);
  const feature = useFeature(featureIndex);
  const colors = useSelector(feature, state => state.context.colors);
  const color = colors[foreground];

  const newTooltip = (
    <span>
      New (<kbd>N</kbd>)
    </span>
  );

  const resetTooltip = (
    <span>
      Reset (<kbd>Esc</kbd>)
    </span>
  );

  const prevTooltip = (
    <span>
      Previous (<kbd>[</kbd>)
    </span>
  );

  const nextTooltip = (
    <span>
      Next (<kbd>]</kbd>)
    </span>
  );

  return (
    <Box
      className={styles.foreground}
      style={{ background: color }}
      onMouseEnter={() => setShowButtons(true)}
      onMouseLeave={() => setShowButtons(false)}
    >
      {showButtons && (
        <Tooltip title={newTooltip}>
          <IconButton
            className={styles.topLeft}
            size='small'
            onClick={() => send('NEW_FOREGROUND')}
          >
            <AddIcon color={buttonColor} />
          </IconButton>
        </Tooltip>
      )}
      {showButtons && (
        <Tooltip title={resetTooltip}>
          <IconButton
            className={styles.topRight}
            size='small'
            onClick={() => send('RESET_FOREGROUND')}
          >
            <ClearIcon color={buttonColor} />
          </IconButton>
        </Tooltip>
      )}
      {showButtons && (
        <Tooltip title={prevTooltip}>
          <IconButton
            className={styles.bottomLeft}
            size='small'
            onClick={() => send('PREV_FOREGROUND')}
          >
            <ArrowBackIosIcon color={buttonColor} />
          </IconButton>
        </Tooltip>
      )}
      {showButtons && (
        <Tooltip title={nextTooltip}>
          <IconButton
            className={styles.bottomRight}
            size='small'
            onClick={() => send('NEXT_FOREGROUND')}
          >
            <ArrowBackIosIcon
              color={buttonColor}
              style={{ transform: 'rotate(180deg)' }}
            />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

function BackgroundBox() {
  const select = useSelect();
  const { send } = select;
  const background = useSelector(select, state => state.context.background);

  const [showButtons, setShowButtons] = useState(false);
  const buttonColor = background === 0 ? 'secondary' : 'default';

  const styles = useStyles();

  const labeled = useLabeled();
  const featureIndex = useSelector(labeled, state => state.context.feature);
  const feature = useFeature(featureIndex);
  const colors = useSelector(feature, state => state.context.colors);
  const color = colors[background];

  const resetTooltip = (
    <span>
      Reset (<kbd>Esc</kbd>)
    </span>
  );

  const prevTooltip = (
    <span>
      Previous (<kbd>Shift</kbd> + <kbd>[</kbd>)
    </span>
  );

  const nextTooltip = (
    <span>
      Next (<kbd>Shift</kbd> + <kbd>]</kbd>)
    </span>
  );

  return (
    <Box
      className={styles.background}
      style={{ background: color }}
      onMouseEnter={() => setShowButtons(true)}
      onMouseLeave={() => setShowButtons(false)}
    >
      {showButtons && (
        <Tooltip title={resetTooltip}>
          <IconButton
            className={styles.topRight}
            size='small'
            onClick={() => send('RESET_BACKGROUND')}
          >
            <ClearIcon color={buttonColor} />
          </IconButton>
        </Tooltip>
      )}
      {showButtons && (
        <Tooltip title={prevTooltip}>
          <IconButton
            className={styles.bottomLeft}
            size='small'
            onClick={() => send('PREV_BACKGROUND')}
          >
            <ArrowBackIosIcon color={buttonColor} />
          </IconButton>
        </Tooltip>
      )}
      {showButtons && (
        <Tooltip title={nextTooltip}>
          <IconButton
            className={styles.bottomRight}
            size='small'
            onClick={() => send('NEXT_BACKGROUND')}
          >
            <ArrowBackIosIcon
              color={buttonColor}
              style={{ transform: 'rotate(180deg)' }}
            />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

export default function SelectedPalette() {
  const styles = useStyles();

  const tooltipText = (
    <span>
      When the foreground is no label, the top box is black.
      <br />
      When the background is no label, the bottom box is black.
    </span>
  );

  return (
    <Box className={styles.palette}>
      <ForegroundBox />
      <BackgroundBox />
      <Box className={styles.swapBox}>
        <SwapButton />
      </Box>
      <Tooltip title={tooltipText}>
        <HelpOutlineIcon
          className={styles.help}
          color='action'
          fontSize='large'
        />
      </Tooltip>
    </Box>
  );
}
