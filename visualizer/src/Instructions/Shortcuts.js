import { Box, Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import React from 'react';

const useStyles = makeStyles(theme => ({
  shortcuts: {
    padding: theme.spacing(1),
    display: 'flex',
    height: 'fit-content',
    flexDirection: 'column',
  },
  shortcut: {
    width: 'auto',
    display: 'flex',
    flexFlow: 'row nowrap',
    justifyContent: 'space-between',
    margin: theme.spacing(0.5),
  },
  description: {
    marginRight: theme.spacing(1),
    whiteSpace: 'nowrap',
  },
  hotkey: {
    whiteSpace: 'nowrap',
  },
}));

export function Shortcut({ text, shortcut }) {
  const styles = useStyles();
  return (
    <Box className={styles.shortcut}>
      <div className={styles.description}>{text}</div>
      <div className={styles.hotkey}>
        {shortcut.split('+').map((key, i) =>
          i === 0 ? (
            <kbd>{key}</kbd>
          ) : (
            <>
              {' + '} <kbd>{key}</kbd>
            </>
          )
        )}
      </div>
    </Box>
  );
}

export function Shortcuts({ children }) {
  const styles = useStyles();
  return (
    <Paper className={styles.shortcuts} elevation={5}>
      <Typography variant='h5'>Shortcuts</Typography>
      {children}
    </Paper>
  );
}
