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
import makeStyles from '@mui/styles/makeStyles';
import { useActor, useSelector } from '@xstate/react';
import { PropTypes } from 'prop-types';
import React from 'react';
import Dropzone from 'react-dropzone';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    height: '100%',
  },
  preview: {
    borderRadius: theme.spacing(1),
    objectFit: 'cover',
    width: theme.spacing(10),
    height: theme.spacing(10),
  },
  uploadIcon: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
    height: '100%',
  },
  uploadForm: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  submit: {
    width: '100%',
    margin: theme.spacing(1),
  },
  progress: {
    margin: theme.spacing(1),
    width: '100%',
  },
}));

function ImageAxesDropDown({ loadService }) {
  const axes = useSelector(loadService, (state) => state.context.axes);

  const allAxes = ['YXC', 'ZYXC', 'CYX', 'CZYX'];

  return (
    <Box display='flex' style={{ width: '100%' }}>
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

  const classes = useStyles();

  return (
    <>
      <Dropzone
        name='imageUploadInput'
        onDrop={(files) => send({ type: 'SET_UPLOAD_FILE', files })}
        accept='image/png, image/tiff, .npz, .trk'
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
                  className={classes.paddedTop}
                  variant='caption'
                  display='block'
                  align='center'
                  color='error'
                  key={file.path}
                >
                  {file.path} is not a valid file. Please upload a .tiff, .png, or .npz.
                </Typography>
              ))}

              {/* Display error to user */}
              {showError && (
                <Typography
                  className={classes.paddedTop}
                  variant='caption'
                  display='block'
                  align='center'
                  color='error'
                >
                  {errorText}
                </Typography>
              )}

              <div align='center' display='block'>
                {state.matches('idle') && (
                  <CloudUpload color='disabled' fontSize='large' className={classes.uploadIcon} />
                )}
              </div>
            </div>
            {file && (
              <Container maxWidth='xs' className={classes.uploadForm}>
                <img className={classes.preview} src={file.preview} />
                <Typography>{file.path}</Typography>
                {file.type !== 'image/png' && <ImageAxesDropDown loadService={loadService} />}
                <Button
                  className={classes.submit}
                  variant='contained'
                  color='primary'
                  endIcon={<SendIcon />}
                  onClick={() => loadService.send({ type: 'SUBMIT_UPLOAD' })}
                >
                  Upload
                </Button>
                {state.matches('submittingUpload') && (
                  <LinearProgress className={classes.progress} />
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
