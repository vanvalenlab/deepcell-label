import { Box, Button, LinearProgress, makeStyles } from '@material-ui/core';
import Select from '@material-ui/core/Select';
import SendIcon from '@material-ui/icons/Send';
import axios from 'axios';
import React, { useCallback, useState } from 'react';

const DCL_DOMAIN = 'http://localhost:3000';

const useStyles = makeStyles(theme => ({
  examplesBox: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  select: {
    margin: theme.spacing(3),
    padding: theme.spacing(1),
  },
  submit: {
    width: '100%',
  },
  progress: {
    margin: theme.spacing(1),
    width: '100%',
  },
}));

const exampleFiles = [
  {
    // TODO: create mesmer predictions and add errors
    path: 'https://caliban-input.s3.us-east-2.amazonaws.com/test/test.npz',
    name: '2D tissue segmentation',
  },
  {
    path: 'https://caliban-input.s3.us-east-2.amazonaws.com/test/test.npz',
    name: '3D organoid segmentation',
  },
  {
    path: 'https://caliban-input.s3.us-east-2.amazonaws.com/test/example_corrected.trk',
    name: 'corrected tracking timelapse',
  },
  {
    path: 'https://caliban-input.s3.us-east-2.amazonaws.com/test/example_uncorrected.trk',
    name: 'uncorrected tracking timelapse',
  },
];

function ExampleFileSelect() {
  const [value, setValue] = useState(false);
  const [loading, setLoading] = useState(false);

  const styles = useStyles();

  const onClick = useCallback(
    e => {
      setLoading(true);
      const formData = new FormData();
      formData.append('url', exampleFiles[value].path);
      axios
        .post('/api/project', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(response => {
          const { projectId } = response.data;
          window.location.href = `${DCL_DOMAIN}/project?projectId=${projectId}`;
        });
    },
    [value]
  );

  return (
    <Box className={styles.examplesBox}>
      <Select
        className={styles.select}
        native
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={loading}
      >
        <option disabled value={false} style={{ display: 'none' }}>
          Or select an example file and press Submit
        </option>
        {exampleFiles.map((file, index) => (
          <option key={file.path} value={index}>
            {file.name}
          </option>
        ))}
      </Select>
      <Button
        className={styles.submit}
        variant='contained'
        color='primary'
        endIcon={<SendIcon />}
        onClick={onClick}
        disabled={value === 0 || loading}
      >
        Submit
      </Button>
      {loading && <LinearProgress className={styles.progress} />}
    </Box>
  );
}

export default ExampleFileSelect;
