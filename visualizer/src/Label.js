import { useState, useRef, useEffect } from 'react';
import Box from '@material-ui/core/Box';
import { makeStyles } from "@material-ui/core/styles";
import { useSelector } from '@xstate/react';
import { ResizeSensor } from 'css-element-queries';
import debounce from 'lodash.debounce';

import ImageControls from './ControlPanel/ImageControls';
import LabeledController from './ControlPanel/LabeledController';
import UndoRedo from './ControlPanel/UndoRedo';
import Navbar from './Navbar';
import Canvas from './Canvas/Canvas';
import Instructions from './Instructions/Instructions';
import Footer from './Footer/Footer';
import ToolControls from './ControlPanel/ToolControls';
import { useCanvas } from './ServiceContext';
import ActionButtons from './ControlPanel/ActionButtons';
import SelectedPalette from './ControlPanel/SelectedPalette';


const useStyles = makeStyles({
  root: {
    boxSizing: 'border-box',
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column',
  },
  main: {
    boxSizing: 'border-box',
    display: "flex",
    flexGrow: 1,
    padding: 16,
    alignItems: "stretch",
    justifyContent: "space-evenly",
    minHeight: 'calc(100vh - 66px - 57px - 60px - 1px)',
    // height: 'calc(100vh - 66px - 57px - 60px - 80px - 1px)'
  },
  controlPanelBox: {
    minWidth: '300px',
    flex: '0 0 auto',
  },
  toolbarBox: {
    flex: '0 0 auto',
  },
  canvasBox: {
    position: 'relative',
    flex: '1 1 auto',
    maxHeight: '100vh',
    maxWidth: '100vw',
  },
});

function Label() {
  const styles = useStyles();

  const canvasBoxRef = useRef({ offsetWidth: 0, offsetHeight: 0 });
  const [canvasBoxWidth, setCanvasBoxWidth] = useState(0);
  const [canvasBoxHeight, setCanvasBoxHeight] = useState(0);

  const canvas = useCanvas();

  useEffect(() => {
    const setCanvasBoxDimensions = () => {
      setCanvasBoxWidth(canvasBoxRef.current.offsetWidth);
      setCanvasBoxHeight(canvasBoxRef.current.offsetHeight);
    };
    setCanvasBoxDimensions();

    new ResizeSensor(canvasBoxRef.current, debounce(setCanvasBoxDimensions, 20));
  }, [canvasBoxRef]);

  useEffect(() => {
    const padding = 5;
    canvas.send({ type: 'RESIZE', width: canvasBoxWidth, height: canvasBoxHeight, padding });
  }, [canvas, canvasBoxWidth, canvasBoxHeight]);

  return (
    <div className={styles.root}>
      <Navbar />
      <Instructions />
      <Box className={styles.main}>
        <Box className={styles.controlPanelBox}>
          {/* <ControlPanel /> */}
          <ImageControls />
        </Box>
        <Box className={styles.toolbarBox}>
          <UndoRedo />
          <ToolControls />
          <ActionButtons />
          <SelectedPalette />
        </Box>
        <Box ref={canvasBoxRef} className={styles.canvasBox}>
          <Canvas />
        </Box>
      </Box>
      <Footer />
    </div>
  );
}

export default Label;
