import './App.css';
import Box from '@material-ui/core/Box';
import { makeStyles } from "@material-ui/core/styles";
import ControlPanel from './ControlPanel/ControlPanel';
import Navbar from './Navbar';
import Canvas from './Canvas/Canvas';
import InstructionPane from './InstructionPane';
import Footer from './Footer/Footer';
import { Slider } from '@material-ui/core';
import { useState, useRef, useEffect } from 'react';


const useStyles = makeStyles({
  root: {
    boxSizing: 'border-box',
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column',
  },
  main: {
    display: "flex",
    flexGrow: 1,
    padding: 16,
    alignItems: "stretch",
    justifyContent: "space-evenly",
    height: 'calc(100vh - 66px - 57px - 60px - 80px - 1px)'
  },
  controlPanel: {
    flex: '0 0 auto',
  },
  canvasBox: {
    position: 'relative',
    flex: '1 1 auto',
  },
});

function App() {
  const styles = useStyles();
  const [zoom, setZoom] = useState(1);
  const handleChange = (event, val) => {
    setZoom(2 ** val);
  };

  const canvasBoxRef = useRef({ offsetWidth: 0, offsetHeight: 0 });
  const [canvasBoxWidth, setCanvasBoxWidth] = useState(0);
  const [canvasBoxHeight, setCanvasBoxHeight] = useState(0);

  useEffect(() => {
    const setCanvasBoxDimensions = () => {
      setCanvasBoxWidth(canvasBoxRef.current.offsetWidth);
      setCanvasBoxHeight(canvasBoxRef.current.offsetHeight);
    }
    setCanvasBoxDimensions();
    window.addEventListener('resize', setCanvasBoxDimensions);
    return () => window.removeEventListener('resize', setCanvasBoxDimensions);
  }, [canvasBoxRef]);

  return (
    <div className={styles.root}>
      <Navbar />
      <InstructionPane />
      <Box className={styles.main}>
        <Box>
          <ControlPanel className={styles.controlPanel} />
          <Slider
            defaultValue={0}
            step={0.1}
            marks
            min={0}
            max={3}
            scale={(x) => (2 ** x).toFixed(2)}
            valueLabelDisplay="auto"
            onChange={handleChange}
          />
        </Box>
        <Box ref={canvasBoxRef} className={styles.canvasBox}>
          <Canvas zoom={zoom} width={canvasBoxWidth} height={canvasBoxHeight} />
        </Box>
      </Box>
      <Footer />
    </div>
  );
}

export default App;
