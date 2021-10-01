import { Box, makeStyles } from '@material-ui/core';
import { green } from '@material-ui/core/colors';
import React from 'react';
import { useLabeled, useRaw } from '../../ProjectContext';
import DownloadButton from './DownloadButton';
import LabeledControls from './LabeledControls/LabeledControls';
import RawControls from './RawControls/RawControls';
import SubmitButton from './SubmitButton';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    // width: '100%',
    padding: theme.spacing(1),
  },
  buttons: {
    width: '100%',
  },
  title: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  buttonProgress: {
    color: green[500],
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
}));

const ImageControls = () => {
  const styles = useStyles();

  const raw = useRaw();
  const labeled = useLabeled();

  const search = new URLSearchParams(window.location.search);
  const download = search.get('download');

  return (
    <Box id='image-controls' className={styles.root}>
      {download ? (
        <DownloadButton className={styles.buttons} />
      ) : (
        <SubmitButton className={styles.buttons} />
      )}
      {labeled && <LabeledControls />}
      {raw && <RawControls />}
    </Box>
  );
};

export default ImageControls;
