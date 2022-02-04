import { Box, Paper } from '@mui/material';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/system';
import React from 'react';

const Div = styled('div')``;

export function Shortcut({ text, shortcut }) {
  const hotkeyText = shortcut.split('+').map((key, i) =>
    i === 0 ? (
      <kbd key={i}>{key}</kbd>
    ) : (
      <span key={i}>
        +<kbd>{key}</kbd>
      </span>
    )
  );

  return (
    <Box
      sx={{
        width: 'auto',
        display: 'flex',
        flexFlow: 'row nowrap',
        justifyContent: 'space-between',
        m: 0.5,
      }}
    >
      <Div sx={{ mr: 1, whiteSpace: 'nowrap' }}>{text}</Div>
      <Div sx={{ whiteSpace: 'nowrap' }}>{hotkeyText}</Div>
    </Box>
  );
}

export function Shortcuts({ children }) {
  return (
    <Paper
      sx={{
        p: 1,
        display: 'flex',
        height: 'fit-content',
        flexDirection: 'column',
        ml: 2,
      }}
      elevation={5}
    >
      <Typography variant='h5'>Shortcuts</Typography>
      {children}
    </Paper>
  );
}
