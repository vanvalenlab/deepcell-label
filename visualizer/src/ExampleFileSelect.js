import { Box, Button, makeStyles } from '@material-ui/core';
import Select from '@material-ui/core/Select';
import SendIcon from '@material-ui/icons/Send';
import axios from 'axios';
import React, { useCallback, useState } from 'react';

const DCL_DOMAIN = 'http://localhost:3000';

const useStyles = makeStyles(theme => ({
  box: {},
  select: {
    margin: theme.spacing(3),
    padding: theme.spacing(1),
  },
  submit: {},
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

  const styles = useStyles();

  const onClick = useCallback(
    e => {
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
    <Box display='flex' flexDirection='column'>
      <Select
        className={styles.select}
        native
        value={value}
        onChange={e => setValue(e.target.value)}
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
        variant='contained'
        color='primary'
        endIcon={<SendIcon />}
        onClick={onClick}
        disabled={value === 0}
      >
        Submit
      </Button>
    </Box>
  );
}

export default ExampleFileSelect;
