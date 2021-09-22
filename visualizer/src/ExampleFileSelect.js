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
    path: 'https://caliban-input.s3.us-east-2.amazonaws.com/test/test.npz',
    name: '3D organoid annotation',
  },
  {
    path: 'https://caliban-input.s3.us-east-2.amazonaws.com/test/mouse_s1_uncorrected_fullsize_all_channels_x_05_y_03_save_version_0.npz',
    name: '3D nuclei in tissue',
  },
  {
    path: 'https://caliban-input.s3.us-east-2.amazonaws.com/test/HeLa_movie_s0_uncorrected_fullsize_all_channels_x_00_y_01_frames_5-9.npz',
    name: 'HeLa cytoplasm timelapse with errors',
  },
  {
    path: 'https://caliban-input.s3.us-east-2.amazonaws.com/test/fov_4b55271de34c40fcba5ec13fac73f57b_crop_0_crop_0_slice_0_fake_cyto.npz',
    name: 'large field of view',
  },
  {
    path: 'https://caliban-input.s3.us-east-2.amazonaws.com/test/fov_4b55271de34c40fcba5ec13fac73f57b_crop_0_crop_0_slice_0.npz',
    name: 'multi-channel large field of view',
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
