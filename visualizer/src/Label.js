import { FormLabel, Paper, Tab, Tabs } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import { useSelector } from '@xstate/react';
import { ResizeSensor } from 'css-element-queries';
import debounce from 'lodash.debounce';
import { useEffect, useRef, useState } from 'react';
import Canvas from './Canvas/Canvas';
import ImageControls from './Controls/ImageControls/ImageControls';
import QCControls from './Controls/QCControls';
import ActionButtons from './Controls/Segment/ActionButtons';
import SelectedPalette from './Controls/Segment/SelectedPalette';
import ToolButtons from './Controls/Segment/ToolButtons';
import UndoRedo from './Controls/Segment/UndoRedo';
import DivisionAlerts from './Controls/Tracking/Alerts/DivisionAlerts';
import FrameSlider from './Controls/Tracking/FrameSlider';
import Timeline from './Controls/Tracking/Timeline';
import Instructions from './Instructions/Instructions';
import { useCanvas, useLabeled, useLabelMode } from './ProjectContext';
import SelectRegistryFile from './SelectRegistryFile';

const useStyles = makeStyles(theme => ({
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

function Label({ review }) {
  const styles = useStyles();

  const search = new URLSearchParams(window.location.search);
  const track = search.get('track');

  const canvasBoxRef = useRef({ offsetWidth: 0, offsetHeight: 0 });
  const [canvasBoxWidth, setCanvasBoxWidth] = useState(0);
  const [canvasBoxHeight, setCanvasBoxHeight] = useState(0);

  const labelMode = useLabelMode();
  const canvas = useCanvas();
  const labeled = useLabeled();

  const value = useSelector(labelMode, state => {
    return state.matches('segment') ? 0 : state.matches('track') ? 1 : false;
  });

  const handleChange = (event, newValue) => {
    switch (newValue) {
      case 0:
        labelMode.send('SEGMENT');
        break;
      case 1:
        labelMode.send('TRACK');
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
    <>
      <Instructions />
      <Box className={styles.main}>
        <Box className={styles.controlPanelBox}>
          <SelectRegistryFile />
          {track && (
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
          )}
          {review && <QCControls />}
          <ImageControls />
        </Box>
        <Box className={styles.toolbarBox}>
          <TabPanel value={value} index={0}>
            <Box display='flex' flexDirection='column'>
              <UndoRedo />
              <FormLabel>Frame</FormLabel>
              <FrameSlider />
              <Box display='flex' flexDirection='row'>
                <Box display='flex' flexDirection='column'>
                  <ToolButtons />
                  <ActionButtons />
                </Box>
                {labeled && <SelectedPalette />}
              </Box>
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
    </>
  );
}

export default Label;
