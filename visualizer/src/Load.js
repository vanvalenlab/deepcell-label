import { Box, Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import ExampleFileSelect from './ExampleFileSelect';
import FileUpload from './FileUpload';
import Footer from './Footer/Footer';
import Navbar from './Navbar';

// eslint-disable-line no-unused-vars
const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column',
  },
  main: {
    flexGrow: 1,
  },
  paper: {
    padding: theme.spacing(4),
    width: '100%',
    boxSizing: 'border-box',
  },
  uploadBox: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: theme.spacing(4),
    boxSizing: 'border-box',
  },
}));

function Load() {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Navbar />
      <main className={styles.main}>
        <Box className={styles.uploadBox}>
          <Paper className={styles.paper}>
            <FileUpload
              infoText='Upload file to create a DeepCell Label project'
              onDroppedFile={() => {}}
            />
          </Paper>
          <ExampleFileSelect />
        </Box>
      </main>
      <Footer />
    </div>
  );
}

export default Load;
