import './App.css';
import Box from '@material-ui/core/Box';
import { makeStyles } from "@material-ui/core/styles";
import ControlPanel from './ControlPanel';
import Navbar from './Navbar';
import Canvas from './Canvas';
import InstructionPane from './InstructionPane';
import Footer from './Footer';

function App() {

  const styles = makeStyles({
    root: {
      textAlign: 'center',
      height: '100vh',
    },
    controlPanel: {
      flex: '0 1 auto',
    },
    // canvas: {
    //   flex: '1 1 auto',
    //   height: '90vh'
    // }
  });

  return (
    <div className={styles.root}>
      <Navbar />
      <InstructionPane />
      <Box display="flex" justifyContent="space-evenly" alignItems="flex-start" p={5}>
        <Box boxShadow={3}>
          <ControlPanel className={styles.controlPanel}q/>
        </Box>
        <Box display="flex" boxShadow={10}>
          <Canvas />
        </Box>
      </Box>
      <Footer />
    </div>
  );
}

export default App;
