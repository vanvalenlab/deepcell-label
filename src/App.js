import './App.css';
import Box from '@material-ui/core/Box';
import { makeStyles } from "@material-ui/core/styles";
import ControlPanel from './ControlPanel';
import Navbar from './Navbar';
import Canvas from './Canvas';
import { RawCanvas, LabelCanvas, OutlineCanvas } from './Canvas';
import InstructionPane from './InstructionPane';
import Footer from './Footer';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column',
  },
  main: {
    display: "flex",
    flexGrow: 1,
    padding: 40,
    alignItems: "flex-start",
    justifyContent: "space-evenly",
  },
  controlPanel: {
    flex: '0 1 auto',
  },
  canvas: {
    flex: '1 1 auto',
    // height: '90vh'
  }
});

function App() {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Navbar />
      <InstructionPane />
      <Box className={styles.main}>
        <Box boxShadow={3}>
          <ControlPanel className={styles.controlPanel}/>
        </Box>
        <Box display="flex" className={styles.canvas} boxShadow={10}>
          <RawCanvas />
          <LabelCanvas />
          <OutlineCanvas />
        </Box>
      </Box>
      <Footer />
    </div>
  );
}

export default App;
