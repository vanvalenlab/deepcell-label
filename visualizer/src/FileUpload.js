// import HelpIcon from '@material-ui/icons/Help';
import Container from '@material-ui/core/Container';
import FormControl from '@material-ui/core/FormControl';
// import IconButton from '@material-ui/core/IconButton';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import { makeStyles } from '@material-ui/core/styles';
// import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import CloudUpload from '@material-ui/icons/CloudUpload';
import axios from 'axios';
import { PropTypes } from 'prop-types';
import React, { useCallback, useState } from 'react';
import Dropzone from 'react-dropzone';

const DCL_DOMAIN = 'http://localhost:3000';

const useStyles = makeStyles(theme => ({
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
}));

function ImageAxesDropDown(props) {
  const { axes, onChange } = props;

  const allAxes = ['YXC', 'ZYXC', 'CYX', 'CZYX'];

  return (
    <FormControl fullWidth>
      <InputLabel id='image-axes-input-label'>Image Axes</InputLabel>
      {/* TODO: use a tooltip to add more information. Can't get it to align */}
      {/* <Tooltip title="What are the dimensions of the image?" placement='right'>
        <IconButton>
          <HelpIcon />
        </IconButton>
      </Tooltip> */}
      <Select
        labelId='image-axes-select-label'
        id='image-axes-select'
        value={axes}
        label='Axes'
        onChange={onChange}
        autoWidth
      >
        {allAxes.map((ax, i) => (
          <MenuItem value={ax} key={i}>
            {ax}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default function FileUpload(props) {
  const [showError, setShowError] = useState(false);
  const [errorText, setErrorText] = useState('');

  const [imageAxes, setImageAxes] = useState('YXC');

  const { infoText, onDroppedFile } = props;

  const classes = useStyles();

  // This function will run upon file upload completion.
  const onDrop = useCallback(
    droppedFiles => {
      if (droppedFiles.length > 1) {
        setShowError(true);
        setErrorText('Only single file uploads are supported.');
      } else {
        droppedFiles.map(f => {
          let formData = new FormData();
          formData.append('file', f);
          formData.append('axes', imageAxes);
          axios
            .post('/api/project/dropped', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
            .then(response => {
              const { projectId } = response.data;
              window.location.href = `${DCL_DOMAIN}/project?projectId=${projectId}`;
            })
            .catch(error => {
              setShowError(true);
              setErrorText(`${error}`);
            });
        });
      }
    },
    [imageAxes]
  );

  // const { getRootProps, getInputProps, isDragActive } = useDropzone({onDrop});

  return (
    <>
      <Dropzone name='imageUploadInput' onDrop={onDrop} accept='image/png, image/tiff, .npz'>
        {({ getRootProps, getInputProps, fileRejections }) => (
          <section>
            <div {...getRootProps()}>
              <input {...getInputProps()} />

              <Typography
                variant='subtitle1'
                display='block'
                align='center'
                color='textPrimary'
                paragraph
              >
                {infoText}
              </Typography>
              <Typography
                variant='caption'
                display='block'
                align='center'
                color='textSecondary'
                gutterBottom
              >
                Drag and drop your files here or click to browse
              </Typography>

              {fileRejections.map(({ file, errors }) => (
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
                <CloudUpload color='disabled' fontSize='large' className={classes.uploadIcon} />
              </div>
            </div>
          </section>
        )}
      </Dropzone>
      <Container maxWidth={'xs'}>
        <ImageAxesDropDown axes={imageAxes} onChange={e => setImageAxes(e.target.value)} />
      </Container>
    </>
  );
}

FileUpload.propTypes = {
  infoText: PropTypes.string,
  onDroppedFile: PropTypes.func,
};
