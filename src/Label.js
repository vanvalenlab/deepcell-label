import Box from '@material-ui/core/Box';
import { makeStyles } from "@material-ui/core/styles";
import ControlPanel from './ControlPanel/ControlPanel';
import Navbar from './Navbar';
import Canvas from './Canvas/Canvas';
import InstructionPane from './InstructionPane';
import Footer from './Footer/Footer';
import { useState, useRef, useEffect } from 'react';
import './keybindings';

import { useLocation } from "react-router-dom";

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

function Label() {
  const styles = useStyles();

  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get('projectId');

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
        </Box>
        <Box ref={canvasBoxRef} className={styles.canvasBox}>
          <Canvas width={canvasBoxWidth} height={canvasBoxHeight} />
        </Box>
      </Box>
      <Footer />
    </div>
  );
}

export default Label;
