import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import LinearProgress from '@material-ui/core/LinearProgress';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import axios from 'axios';
import queryString from 'query-string';
import React, { useState } from 'react';

import ModelDropdown from './ModelDropdown';
import ScaleForm from './ScaleForm';

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    padding: theme.spacing(2),
  },
  progress: {
    margin: theme.spacing(2),
  },
  paddedTop: {
    paddingTop: theme.spacing(4),
  },
  title: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(2),
    height: '100%',
    width: '100%',
  },
}));

export default function Predict() {
  const [fileName, setFileName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [downloadURL, setDownloadURL] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [progress, setProgress] = useState(0);
  const [selectedJobType, setSelectedJobType] = useState('');
  const [isAutoRescaleEnabled, setIsAutoRescaleEnabled] = useState(true);
  const [scale, setScale] = useState(1);

  const classes = useStyles();

  const showErrorMessage = errText => {
    setErrorText(errText);
    setShowError(true);
  };

  const expireRedisHash = (redisHash, expireIn) => {
    axios({
      method: 'post',
      url: 'https://deepcell.org/api/redis/expire',
      data: {
        hash: redisHash,
        expireIn: expireIn,
      },
    })
      .then(response => {
        if (parseInt(response.data.value) !== 1) {
          showErrorMessage('Hash not expired');
        }
      })
      .catch(error => {
        showErrorMessage(`Failed to expire redis hash due to error: ${error}`);
      });
  };

  const checkJobStatus = (redisHash, interval) => {
    let statusCheck = setInterval(() => {
      axios({
        method: 'post',
        url: 'https://deepcell.org/api/redis',
        data: {
          hash: redisHash,
          key: ['status', 'progress', 'output_url', 'reason', 'failures'],
        },
      })
        .then(response => {
          if (response.data.value[0] === 'failed') {
            clearInterval(statusCheck);
            showErrorMessage(`Job Failed: ${response.data.value[3]}`);
            expireRedisHash(redisHash, 3600);
          } else if (response.data.value[0] === 'done') {
            clearInterval(statusCheck);
            setDownloadURL(response.data.value[2]);
            expireRedisHash(redisHash, 3600);
            // This is only used during zip uploads.
            // Some jobs may fail while other jobs can succeed.
            const failures = response.data.value[4];
            if (failures != null && failures.length > 0) {
              const parsed = queryString.parse(failures);
              let errText = 'Not all jobs completed!\n\n';
              for (const key in parsed) {
                errText += `Job Failed: ${key}: ${parsed[key]}\n\n`;
              }
              showErrorMessage(errText);
            }
          } else {
            let maybeNum = parseInt(response.data.value[1], 10);
            if (!isNaN(maybeNum)) {
              setProgress(maybeNum);
            }
          }
        })
        .catch(error => {
          let errMsg = `Trouble communicating with Redis due to error: ${error}`;
          showErrorMessage(errMsg);
        });
    }, interval);
  };

  const predict = () => {
    axios({
      method: 'post',
      url: 'https://deepcell.org/api/predict',
      timeout: 60 * 4 * 1000, // 4 minutes
      data: {
        imageName: fileName,
        uploadedName: uploadedFileName,
        imageUrl: imageUrl,
        jobType: selectedJobType,
        dataRescale: isAutoRescaleEnabled ? '' : scale,
      },
    })
      .then(response => {
        checkJobStatus(response.data.hash, 3000);
      })
      .catch(error => {
        let errMsg = `Failed to create job due to error: ${error}.`;
        showErrorMessage(errMsg);
      });
  };

  const handleSubmit = event => {
    setSubmitted(true);
    predict();
  };

  return (
    <div className={classes.root}>
      <Box display='flex' flexDirection='column'>
        <Typography>Prediction Type</Typography>
        <ModelDropdown
          value={selectedJobType}
          onChange={setSelectedJobType}
          onError={showErrorMessage}
        />
        <ScaleForm
          checked={isAutoRescaleEnabled}
          scale={scale}
          onCheckboxChange={e =>
            setIsAutoRescaleEnabled(Boolean(e.target.checked))
          }
          onScaleChange={e => setScale(Number(e.target.value))}
        />
        {!submitted && (
          <Button
            id='submitButton'
            variant='contained'
            onClick={handleSubmit}
            size='large'
            fullWidth
            color='primary'
          >
            Predict
          </Button>
        )}
        {/* Progress bar for submitted jobs */}
        {submitted && !showError && downloadURL === null ? (
          progress === 0 || progress === null ? (
            <Grid item lg className={classes.paddedTop}>
              <LinearProgress
                variant='buffer'
                value={0}
                valueBuffer={0}
                className={classes.progress}
              />
            </Grid>
          ) : (
            <Grid item lg className={classes.paddedTop}>
              <LinearProgress
                variant='determinate'
                value={progress}
                className={classes.progress}
              />
            </Grid>
          )
        ) : null}
      </Box>
    </div>

    // <div className={classes.root}>

    //   <Container maxWidth="md" className={classes.paddedTop}>
    //     <form autoComplete="off">
    //       <Box display='flex'>
    //         <Paper className={classes.paper}>
    //           <Typography>
    //             Prediction Type
    //           </Typography>
    //           <ModelDropdown
    //             value={selectedJobType}
    //             onChange={setSelectedJobType}
    //             onError={showErrorMessage}
    //             />
    //         </Paper>
    //       </Box>
    //       <Grid container direction="row" justify="center" spacing={6}>

    //         {/* Job configuration for user on right column */}
    //         <Grid item xs={12} sm={6}>

    //           {/* Job Options section */}
    //           <Grid container direction="row" justify="center">
    //             <Paper className={classes.paper}>
    //               <Grid item lg>
    //                 <Typography>
    //                   Prediction Type
    //                 </Typography>
    //                 <ModelDropdown
    //                   value={selectedJobType}
    //                   onChange={setSelectedJobType}
    //                   onError={showErrorMessage}
    //                 />
    //               </Grid>
    //               <Grid item lg>
    //                 <ScaleForm
    //                   checked={isAutoRescaleEnabled}
    //                   scale={scale}
    //                   onCheckboxChange={e => setIsAutoRescaleEnabled(Boolean(e.target.checked))}
    //                   onScaleChange={e => setScale(Number(e.target.value))}
    //                 />
    //               </Grid>
    //             </Paper>
    //           </Grid>

    //           {/* File Upload section */}
    //           <Grid container direction="row" justify="center" className={classes.paddedTop}>
    //             <Paper className={classes.paper}>
    //               <Grid item lg>
    //                 <FileUpload
    //                   infoText='Upload Here to Begin Image Prediction'
    //                   onDroppedFile={(uploadedName, fileName, url) => {
    //                     setUploadedFileName(uploadedName);
    //                     setFileName(fileName);
    //                     setImageUrl(url);
    //                   }} />
    //               </Grid>
    //             </Paper>
    //           </Grid>

    //         </Grid>

    //       </Grid>

    //       {/* Display error to user */}
    //       { errorText.length > 0 &&
    //         <Typography
    //           className={classes.paddedTop}
    //           variant='body2'
    //           style={{whiteSpace: 'pre-line'}}
    //           align='center'
    //           color='error'>
    //           {errorText}
    //         </Typography> }

    //       {/* Submit button */}
    //       { !submitted &&
    //         <Grid id='submitButtonWrapper' item lg className={classes.paddedTop}>
    //           <Button
    //             id='submitButton'
    //             variant='contained'
    //             onClick={handleSubmit}
    //             size='large'
    //             fullWidth
    //             disabled={!canBeSubmitted()}
    //             color='primary'>
    //             Submit
    //           </Button>
    //         </Grid> }

    //       {/* Progress bar for submitted jobs */}
    //       { submitted && !showError && downloadURL === null ?
    //         progress === 0 || progress === null ?
    //           <Grid item lg className={classes.paddedTop}>
    //             <LinearProgress
    //               variant="buffer"
    //               value={0}
    //               valueBuffer={0}
    //               className={classes.progress}
    //             />
    //           </Grid>
    //           :
    //           <Grid item lg className={classes.paddedTop}>
    //             <LinearProgress
    //               variant="determinate"
    //               value={progress}
    //               className={classes.progress}
    //             />
    //           </Grid>
    //         : null }

    //       {/* Download results and Retry buttons */}
    //       { downloadURL !== null &&
    //         <div>
    //           <Grid item lg className={classes.paddedTop}>
    //             <Button
    //               href={downloadURL}
    //               variant='contained'
    //               size='large'
    //               fullWidth
    //               color='secondary'>
    //               Download Results
    //             </Button>
    //           </Grid>

    //           <Grid item lg className={classes.paddedTop}>
    //             <Button
    //               href='/predict'
    //               variant='contained'
    //               size='large'
    //               fullWidth
    //               color='primary'>
    //               Submit New Image
    //             </Button>
    //           </Grid>
    //         </div> }

    //     </form>
    //   </Container>
    // </div>
  );
}
