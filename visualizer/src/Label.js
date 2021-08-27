import { Paper, Tab, Tabs } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import { useSelector } from '@xstate/react';
import { ResizeSensor } from 'css-element-queries';
import debounce from 'lodash.debounce';
import { useEffect, useRef, useState } from 'react';
import Canvas from './Canvas/Canvas';
import ImageControls from './Controls/ImageControls/ImageControls';
import ActionButtons from './Controls/Segment/ActionButtons';
import SelectedPalette from './Controls/Segment/SelectedPalette';
import ToolButtons from './Controls/Segment/ToolButtons';
import UndoRedo from './Controls/Segment/UndoRedo';
import DivisionAlerts from './Controls/Tracking/Alerts/DivisionAlerts';
import Timeline from './Controls/Tracking/Timeline';
import Footer from './Footer/Footer';
import Instructions from './Instructions/Instructions';
import Navbar from './Navbar';
import { useCanvas, useDeepCellLabel, useLabeled } from './ServiceContext';

const useStyles = makeStyles(theme => ({
  root: {
    boxSizing: 'border-box',
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column',
  },
  main: {
    boxSizing: 'border-box',
    display: 'flex',
    flexGrow: 1,
    padding: theme.spacing(1),
    alignItems: 'stretch',
    justifyContent: 'space-evenly',
    minHeight: 'calc(100vh - 66px - 57px - 74px - 1px)',
    // height: 'calc(100vh - 66px - 57px - 60px - 80px - 1px)'
  },
  controlPanelBox: {
    flex: '0 0 auto',
    padding: theme.spacing(1),
  },
  toolbarBox: {
    flex: '0 0 auto',
    padding: theme.spacing(1),
  },
  canvasBox: {
    position: 'relative',
    flex: '1 1 auto',
    maxHeight: '100vh',
    maxWidth: '100vw',
  },
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

function Label() {
  const styles = useStyles();

  const canvasBoxRef = useRef({ offsetWidth: 0, offsetHeight: 0 });
  const [canvasBoxWidth, setCanvasBoxWidth] = useState(0);
  const [canvasBoxHeight, setCanvasBoxHeight] = useState(0);

  const project = useDeepCellLabel();
  const canvas = useCanvas();
  const labeled = useLabeled();

  const value = useSelector(project, state => {
    return state.matches('idle.segment') ? 0 : state.matches('idle.track') ? 1 : false;
  });

  const handleChange = (event, newValue) => {
    switch (newValue) {
      case 0:
        project.send('SEGMENT');
        break;
      case 1:
        project.send('TRACK');
        break;
      default:
        break;
    }
  };

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
    canvas.send({
      type: 'DIMENSIONS',
      width: canvasBoxWidth,
      height: canvasBoxHeight,
      padding,
    });
  }, [canvas, canvasBoxWidth, canvasBoxHeight]);

  return (
    <div className={styles.root}>
      <Navbar />
      <Instructions />
      <Box className={styles.main}>
        <Box className={styles.controlPanelBox}>
          <Paper square>
            <Tabs
              orientation='vertical'
              value={value}
              indicatorColor='primary'
              textColor='primary'
              onChange={handleChange}
            >
              <Tab label='Segment' />
              <Tab label='Track' />
            </Tabs>
          </Paper>
          <ImageControls />
        </Box>
        <Box className={styles.toolbarBox}>
          <TabPanel value={value} index={0}>
            <UndoRedo />
            <Box display='flex' flexDirection='row'>
              <Box display='flex' flexDirection='column'>
                <ToolButtons />
                <ActionButtons />
              </Box>
              {labeled && <SelectedPalette />}
            </Box>
          </TabPanel>
          <TabPanel value={value} index={1}>
            <UndoRedo />
            <DivisionAlerts />
            {labeled && <Timeline />}
          </TabPanel>
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
