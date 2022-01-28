import { Box, Button, LinearProgress } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import Select from '@mui/material/Select';
import SendIcon from '@mui/icons-material/Send';
import { useSelector } from '@xstate/react';
import React from 'react';

const useStyles = makeStyles((theme) => ({
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
    value: 0,
    path: 'https://caliban-input.s3.us-east-2.amazonaws.com/test/vectra_breast_cancer_with_errors.npz',
    name: '2D tissue segmentation',
  },
  {
    value: 1,
    path: 'https://caliban-input.s3.us-east-2.amazonaws.com/test/test.npz',
    name: '3D organoid segmentation',
  },
  {
    value: 2,
    path: 'https://caliban-input.s3.us-east-2.amazonaws.com/test/example_corrected.trk',
    name: 'corrected tracking timelapse',
  },
  {
    value: 3,
    path: 'https://caliban-input.s3.us-east-2.amazonaws.com/test/example_uncorrected.trk',
    name: 'uncorrected tracking timelapse',
  },
];

function ExampleFileSelect({ loadService }) {
  const file = useSelector(loadService, (state) => state.context.exampleFile);
  const loading = useSelector(loadService, (state) => state.matches('submittingExample'));

  const styles = useStyles();

  return (
    <Box className={styles.examplesBox}>
      <Select
        className={styles.select}
        native
        value={file ? file.path : false}
        onChange={(e) => loadService.send({ type: 'SET_EXAMPLE_FILE', file: e.target.value })}
        disabled={loading}
      >
        <option disabled value={false} style={{ display: 'none' }}>
          Or select an example file and press Submit
        </option>
        {exampleFiles.map((file, i) => (
          <option key={file.path} value={file.path}>
            {file.name}
          </option>
        ))}
      </Select>
      <Button
        id='submitExample'
        className={styles.submit}
        variant='contained'
        color='primary'
        endIcon={<SendIcon />}
        onClick={() => loadService.send({ type: 'SUBMIT_EXAMPLE' })}
        disabled={!file || loading}
      >
        Submit
      </Button>
      {loading && <LinearProgress className={styles.progress} />}
    </Box>
  );
}

export default ExampleFileSelect;
