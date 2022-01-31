import AddIcon from '@mui/icons-material/Add';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ClearIcon from '@mui/icons-material/Clear';
import SubdirectoryArrowLeftIcon from '@mui/icons-material/SubdirectoryArrowLeft';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import { FormLabel, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useSelector } from '@xstate/react';
import { bind } from 'mousetrap';
import React, { useEffect, useState } from 'react';
import { useHexColormap, useSelect } from '../../ProjectContext';

// adapted from https://stackoverflow.com/questions/9733288/how-to-programmatically-calculate-the-contrast-ratio-between-two-colors

/**
 * Computes the luminance of a hex color like #000000.
 * Luminance is the perceived brightness of a color.
 * */
function luminance(hex) {
  const [r, g, b] = hex
    .substr(1)
    .match(/(\S{2})/g)
    .map((x) => parseInt(x, 16));
  const a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/** Computes the contrast between two hex colors. */
function contrast(hex1, hex2) {
  var lum1 = luminance(hex1);
  var lum2 = luminance(hex2);
  var brightest = Math.max(lum1, lum2);
  var darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function SwitchIcon() {
  return (
    <>
      <SubdirectoryArrowLeftIcon sx={{ transform: 'rotate(-90deg)' }} />
      <SubdirectoryArrowRightIcon
        sx={{ position: 'absolute', transform: 'rotate(180deg)', top: '0.5rem', left: '0.5rem' }}
      />
    </>
  );
}

export function SwitchButton() {
  const select = useSelect();

  const tooltipText = (
    <span>
      Switch <kbd>X</kbd>
    </span>
  );

  useEffect(() => {
    bind('x', () => select.send('SWITCH'));
  }, [select]);

  return (
    <Tooltip title={tooltipText}>
      <IconButton color='primary' onClick={() => select.send('SWITCH')} size='large'>
        <SwitchIcon />
      </IconButton>
    </Tooltip>
  );
}

function HoveringBox() {
  const select = useSelect();
  const hovering = useSelector(select, (state) => state.context.hovering);

  const colormap = useHexColormap();
  const color = hovering ? colormap[hovering] : '#000000';

  const buttonColor =
    contrast(color, '#000000') > contrast(color, '#FFFFFF') ? '#000000' : '#FFFFFF';

  return (
    <Box
      sx={{
        border: (theme) => `${theme.spacing(0.5)} solid #DDDDDD`,
        width: (theme) => theme.spacing(8),
        height: (theme) => theme.spacing(8),
        display: 'flex',
        alignContent: 'center',
        justifyContent: 'center',
        margin: 1,
      }}
      style={{ background: color }}
    >
      <Typography
        style={{
          color: buttonColor,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {hovering}
      </Typography>
    </Box>
  );
}

function ForegroundBox() {
  const select = useSelect();
  const { send } = select;
  const foreground = useSelector(select, (state) => state.context.foreground);

  const colormap = useHexColormap();
  const color = colormap[foreground] ?? '#000000';

  useEffect(() => {
    bind('n', () => select.send('NEW_FOREGROUND'));
    bind('[', () => select.send('PREV_FOREGROUND'));
    bind(']', () => select.send('NEXT_FOREGROUND'));
  }, [select]);

  const [showButtons, setShowButtons] = useState(false);
  const buttonColor =
    contrast(color, '#000000') > contrast(color, '#FFFFFF') ? '#000000' : '#FFFFFF';

  const newTooltip = (
    <span>
      New <kbd>N</kbd>
    </span>
  );

  const resetTooltip = (
    <span>
      Reset <kbd>Esc</kbd>
    </span>
  );

  const prevTooltip = (
    <span>
      Previous <kbd>[</kbd>
    </span>
  );

  const nextTooltip = (
    <span>
      Next <kbd>]</kbd>
    </span>
  );

  return (
    <Box
      sx={{
        position: 'absolute',
        zIndex: 1,
        top: 0,
        left: 0,
        width: (theme) => theme.spacing(8),
        height: (theme) => theme.spacing(8),
        border: (theme) => `${theme.spacing(0.5)} solid #DDDDDD`,
        display: 'flex',
        alignContent: 'center',
        justifyContent: 'center',
        background: color,
      }}
      onMouseEnter={() => setShowButtons(true)}
      onMouseLeave={() => setShowButtons(false)}
    >
      <Typography
        style={{
          color: buttonColor,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {foreground}
      </Typography>
      {showButtons && (
        <Tooltip title={newTooltip}>
          <IconButton
            sx={{ position: 'absolute', top: -5, left: -5 }}
            size='small'
            onClick={() => send('NEW_FOREGROUND')}
          >
            <AddIcon style={{ color: buttonColor }} />
          </IconButton>
        </Tooltip>
      )}
      {showButtons && (
        <Tooltip title={resetTooltip}>
          <IconButton
            sx={{ position: 'absolute', top: -5, right: -5 }}
            size='small'
            onClick={() => send('RESET_FOREGROUND')}
          >
            <ClearIcon style={{ color: buttonColor }} />
          </IconButton>
        </Tooltip>
      )}
      {showButtons && (
        <Tooltip title={prevTooltip}>
          <IconButton
            sx={{ position: 'absolute', bottom: 0, left: 0 }}
            size='small'
            onClick={() => send('PREV_FOREGROUND')}
          >
            <ArrowBackIosIcon style={{ color: buttonColor }} />
          </IconButton>
        </Tooltip>
      )}
      {showButtons && (
        <Tooltip title={nextTooltip}>
          <IconButton
            sx={{ position: 'absolute', bottom: 0, right: 0 }}
            size='small'
            onClick={() => send('NEXT_FOREGROUND')}
          >
            <ArrowBackIosIcon style={{ color: buttonColor, transform: 'rotate(180deg)' }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

function BackgroundBox() {
  const select = useSelect();
  const background = useSelector(select, (state) => state.context.background);

  const colormap = useHexColormap();
  const color = colormap[background] ?? '#000000';

  useEffect(() => {
    bind('{', () => select.send('PREV_BACKGROUND'));
    bind('}', () => select.send('NEXT_BACKGROUND'));
  }, [select]);
  const [showButtons, setShowButtons] = useState(false);
  const buttonColor =
    contrast(color, '#000000') > contrast(color, '#FFFFFF') ? '#000000' : '#FFFFFF';

  const resetTooltip = (
    <span>
      Reset <kbd>Esc</kbd>
    </span>
  );

  const prevTooltip = (
    <span>
      Previous <kbd>Shift</kbd> + <kbd>[</kbd>
    </span>
  );

  const nextTooltip = (
    <span>
      Next <kbd>Shift</kbd> + <kbd>]</kbd>
    </span>
  );

  return (
    <Box
      sx={{
        position: 'absolute',
        top: (theme) => theme.spacing(4),
        left: (theme) => theme.spacing(4),
        width: (theme) => theme.spacing(8),
        height: (theme) => theme.spacing(8),
        border: (theme) => `${theme.spacing(0.5)} solid #DD0000`,
        display: 'flex',
        alignContent: 'center',
        justifyContent: 'center',
        background: color,
      }}
      onMouseEnter={() => setShowButtons(true)}
      onMouseLeave={() => setShowButtons(false)}
    >
      <Typography
        style={{
          color: buttonColor,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        {background}
      </Typography>
      {showButtons && (
        <Tooltip title={resetTooltip}>
          <IconButton
            sx={{ position: 'absolute', top: -5, right: -5 }}
            size='small'
            onClick={() => select.send('RESET_BACKGROUND')}
          >
            <ClearIcon style={{ color: buttonColor }} />
          </IconButton>
        </Tooltip>
      )}
      {showButtons && (
        <Tooltip title={prevTooltip}>
          <IconButton
            sx={{ position: 'absolute', bottom: 0, left: 0 }}
            size='small'
            onClick={() => select.send('PREV_BACKGROUND')}
          >
            <ArrowBackIosIcon style={{ color: buttonColor }} />
          </IconButton>
        </Tooltip>
      )}
      {showButtons && (
        <Tooltip title={nextTooltip}>
          <IconButton
            sx={{ position: 'absolute', bottom: 0, right: 0 }}
            size='small'
            onClick={() => select.send('NEXT_BACKGROUND')}
          >
            <ArrowBackIosIcon style={{ color: buttonColor, transform: 'rotate(180deg)' }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

export function Selected() {
  return (
    <Box
      sx={{
        position: 'relative',
        margin: 1,
        height: (theme) => theme.spacing(13),
        width: (theme) => theme.spacing(13),
      }}
    >
      <Box display='flex' justifyContent='center'>
        <ForegroundBox />
        <BackgroundBox />
        <Box sx={{ position: 'absolute', left: 8, top: -0.5 }}>
          <SwitchButton />
        </Box>
      </Box>
    </Box>
  );
}

function Hovering() {
  return (
    <Box display='flex' justifyContent='center'>
      <HoveringBox />
    </Box>
  );
}

function SelectedPalette() {
  const select = useSelect();

  useEffect(() => {
    bind('esc', () => {
      select.send('RESET_FOREGROUND');
      select.send('RESET_BACKGROUND');
    });
  }, [select]);

  return (
    <Box display='flex' flexDirection='column'>
      <FormLabel sx={{ margin: 1 }}>Selected</FormLabel>
      <Selected />
      <FormLabel sx={{ margin: 1 }}>Hovering over</FormLabel>
      <Hovering />
    </Box>
  );
}

export default SelectedPalette;
