import './App.css';
import Box from '@material-ui/core/Box';
import { makeStyles } from "@material-ui/core/styles";
import ControlPanel from './ControlPanel/ControlPanel';
import Navbar from './Navbar';
import Canvas from './Canvas/Canvas';
import { EmptyCanvas, RawCanvas, LabelCanvas, OutlineCanvas } from './Canvas/Canvas';
import InstructionPane from './InstructionPane';
import Footer from './Footer/Footer';


const useStyles = makeStyles({
  root: {
    boxSizing: 'border-box',
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column',
  },
  main: {
    display: "inline-flex",
    flexGrow: 1,
    padding: 40,
    alignItems: "stretch",
    justifyContent: "space-evenly",
    height: 'calc(100vh - 66px - 57px - 60px - 80px - 1px)'
  },
  controlPanel: {
    flex: '0 0 auto',
  },
  canvas: {
    position: 'relative',
    flex: '1 1 auto',
    // height: 0,
    // paddingTop: 'calc(591.44 / 1127.34 * 100%)',
  },
});

function App() {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Navbar />
      <InstructionPane />
      <Box className={styles.main}>
        <Box>
          <ControlPanel className={styles.controlPanel}/>
        </Box>
        <Box className={styles.canvas} boxShadow={10}>
          <EmptyCanvas />
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
