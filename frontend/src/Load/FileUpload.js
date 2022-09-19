import CloudUpload from '@mui/icons-material/CloudUpload';
import HelpIcon from '@mui/icons-material/Help';
import SendIcon from '@mui/icons-material/Send';
import { Box, Button, LinearProgress } from '@mui/material';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/system';
import { useActor, useSelector } from '@xstate/react';
import { PropTypes } from 'prop-types';
import React from 'react';
import Dropzone from 'react-dropzone';

const Img = styled('img')``;

function ImageAxesDropDown({ loadService }) {
  const axes = useSelector(loadService, (state) => state.context.axes);

  const allAxes = ['YXC', 'ZYXC', 'CYX', 'CZYX'];

  return (
    <Box display='flex' sx={{ width: '100%' }}>
      <FormControl fullWidth>
        <InputLabel id='image-axes-input-label'>Dimension Order</InputLabel>
        <Select
          labelId='image-axes-select-label'
          id='image-axes-select'
          value={axes}
          label='Axes'
          onChange={(e) => loadService.send({ type: 'SET_AXES', axes: e.target.value })}
          autoWidth
        >
          {allAxes.map((ax, i) => (
            <MenuItem value={ax} key={i}>
              {ax}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Tooltip title='What are the dimensions of the image?' placement='right'>
        <IconButton size='large'>
          <HelpIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export default function FileUpload({ loadService }) {
  const [state, send] = useActor(loadService);
  const { errorText, uploadFile: file } = state.context;
  const showError = state.matches('error');

  return (
    <>
      <Dropzone
        name='imageUploadInput'
        onDrop={(files) => send({ type: 'SET_UPLOAD_FILE', files })}
        accept='image/png, image/tiff, application/zip, .zip, .npz, .trk'
      >
        {({ getRootProps, getInputProps, fileRejections }) => (
          <section>
            <div {...getRootProps()}>
              <input data-testid='image-input' {...getInputProps()} />

              <Typography
                variant='subtitle1'
                display='block'
                align='center'
                color='textPrimary'
                paragraph
              >
                Upload file to create a DeepCell Label project
              </Typography>
              {state.matches('idle') && (
                <Typography
                  variant='caption'
                  display='block'
                  align='center'
                  color='textSecondary'
                  gutterBottom
                >
                  Drag and drop your files here or click to browse
                </Typography>
              )}

              {fileRejections.map(({ file }) => (
                <Typography
                  variant='caption'
                  display='block'
                  align='center'
                  color='error'
                  key={file.path}
                >
                  {file.path} is not a valid file. Please upload an image file (tiff, png, or npz)
                  or a zip with both images and labels (tiff or npz for segmentations, json for
                  divisions, or csv for spots)
                </Typography>
              ))}

              {/* Display error to user */}
              {showError && (
                <Typography variant='caption' display='block' align='center' color='error'>
                  {errorText}
                </Typography>
              )}

              <div align='center' display='block'>
                {state.matches('idle') && (
                  <CloudUpload
                    color='disabled'
                    fontSize='large'
                    sx={{
                      py: 4,
                      height: '100%',
                    }}
                  />
                )}
              </div>
            </div>
            {file && (
              <Container
                maxWidth='xs'
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'column',
                }}
              >
                <Img
                  sx={{ borderRadius: 1, objectFit: 'cover', width: '5rem', height: '5rem' }}
                  src={file.preview}
                />
                <Typography>{file.path}</Typography>
                {file.type !== 'image/png' && <ImageAxesDropDown loadService={loadService} />}
                <Button
                  sx={{ width: '100%', m: 1 }}
                  variant='contained'
                  color='primary'
                  endIcon={<SendIcon />}
                  onClick={() => loadService.send({ type: 'SUBMIT_UPLOAD' })}
                >
                  Upload
                </Button>
                {state.matches('submittingUpload') && (
                  <LinearProgress sx={{ m: 1, width: '100%' }} />
                )}
              </Container>
            )}
          </section>
        )}
      </Dropzone>
    </>
  );
}

FileUpload.propTypes = {
  infoText: PropTypes.string,
  onDroppedFile: PropTypes.func,
};
