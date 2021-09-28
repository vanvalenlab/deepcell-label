import { makeStyles } from '@material-ui/core/styles';
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

export default function FileUpload(props) {
  const [showError, setShowError] = useState(false);
  const [errorText, setErrorText] = useState('');

  const { infoText, onDroppedFile } = props;

  const classes = useStyles();

  // This function will run upon file upload completion.
  const onDrop = useCallback(droppedFiles => {
    if (droppedFiles.length > 1) {
      setShowError(true);
      setErrorText('Only single file uploads are supported.');
    } else {
      droppedFiles.map(f => {
        let formData = new FormData();
        formData.append('file', f);
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
  }, []);

  // const { getRootProps, getInputProps, isDragActive } = useDropzone({onDrop});

  return (
    <Dropzone name='imageUploadInput' onDrop={onDrop}>
      {({ getRootProps, getInputProps }) => (
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

            <Typography
              variant='caption'
              display='block'
              align='center'
              color='textSecondary'
              gutterBottom
            >
              Supported files: .tiff, .png, and .npz
            </Typography>

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
  );
}

FileUpload.propTypes = {
  infoText: PropTypes.string,
  onDroppedFile: PropTypes.func,
};
