import { Box, Container, Paper, Typography } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import { useInterpret } from '@xstate/react';
import ExampleFileSelect from './ExampleFileSelect';
import FileUpload from './FileUpload';
import loadMachine from './loadMachine';

// eslint-disable-line no-unused-vars
const useStyles = makeStyles((theme) => ({
  main: {
    flexGrow: 1,
  },
  paper: {
    padding: theme.spacing(4),
    width: '100%',
    boxSizing: 'border-box',
  },
  introBox: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: `calc(100% - ${theme.spacing(4)})`,
    margin: theme.spacing(4),
    boxSizing: 'border-box',
  },
  introText: {
    width: '80%',
    margin: theme.spacing(1),
    boxSizing: 'border-box',
  },
  uploadBox: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: `calc(100% - ${theme.spacing(4)})`,
    margin: theme.spacing(4),
    boxSizing: 'border-box',
  },
}));

function Introduction() {
  const styles = useStyles();

  return (
    <Box className={styles.introBox}>
      <Typography variant='h2' align='center'>
        Welcome to DeepCell Label
      </Typography>
      <Typography variant='body1' className={styles.introText}>
        DeepCell Label is a data labeling tool to segment images into instance labels, mapping each
        pixel to an object in the image.
      </Typography>
      <Typography variant='body1' className={styles.introText}>
        Label can work with 2D images, 3D images, and timelapses. 4D images, or 3D timelapse images,
        are not yet supported. Label expects input images to have frames first and channels last, or
        a ZYXC (TYXC for timelapses) dimension order. When loading images with a different dimension
        order, update the dimensions dropdown in the drag-and-drop box below.
      </Typography>
    </Box>
  );
}

function Load() {
  const styles = useStyles();

  const loadService = useInterpret(loadMachine);
  window.loadService = loadService;

  return (
    <main className={styles.main}>
      <Introduction />
      <Container maxWidth='md'>
        <Box className={styles.uploadBox}>
          <Paper className={styles.paper}>
            <FileUpload loadService={loadService} onDroppedFile={() => {}} />
          </Paper>
          <ExampleFileSelect loadService={loadService} />
        </Box>
      </Container>
    </main>
  );
}

export default Load;
