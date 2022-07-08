import SendIcon from '@mui/icons-material/Send';
import { Box, Button, LinearProgress } from '@mui/material';
import Select from '@mui/material/Select';
import { useSelector } from '@xstate/react';
import React from 'react';

const exampleFiles = [
  {
    value: 0,
    path: 'https://deepcell-label-examples.s3.us-east-2.amazonaws.com/examples/mesmer_with_errors.zip',
    name: '2D tissue segmentation',
  },
  {
    value: 1,
    path: 'https://deepcell-label-examples.s3.us-east-2.amazonaws.com/examples/3D_organoid.zip',
    name: '3D organoid segmentation',
  },
  {
    value: 2,
    path: 'https://deepcell-label-examples.s3.us-east-2.amazonaws.com/examples/corrected_timelapse.zip',
    name: 'corrected tracking timelapse',
  },
  {
    value: 3,
    path: 'https://deepcell-label-examples.s3.us-east-2.amazonaws.com/examples/uncorrected_timelapse.zip',
    name: 'uncorrected tracking timelapse',
  },
];

function ExampleFileSelect({ loadService }) {
  const file = useSelector(loadService, (state) => state.context.exampleFile);
  const loading = useSelector(loadService, (state) => state.matches('submittingExample'));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Select
        sx={{ m: 3, p: 1 }}
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
        sx={{ width: '100%' }}
        variant='contained'
        color='primary'
        endIcon={<SendIcon />}
        onClick={() => loadService.send({ type: 'SUBMIT_EXAMPLE' })}
        disabled={!file || loading}
      >
        Submit
      </Button>
      {loading && <LinearProgress sx={{ m: 1, width: '100%' }} />}
    </Box>
  );
}

export default ExampleFileSelect;
