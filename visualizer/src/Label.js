import { Paper, Tab, Tabs } from '@mui/material';
import Box from '@mui/material/Box';
import { useSelector } from '@xstate/react';
import { ResizeSensor } from 'css-element-queries';
import debounce from 'lodash.debounce';
import { useEffect, useRef, useState } from 'react';
import Canvas from './Canvas/Canvas';
import ImageControls from './Controls/ImageControls/ImageControls';
import QCControls from './Controls/QCControls';
import SegmentControls from './Controls/SegmentControls';
import TrackingControls from './Controls/TrackingControls';
import Instructions from './Instructions/Instructions';
import { useCanvas, useLabelMode } from './ProjectContext';

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
  const search = new URLSearchParams(window.location.search);
  const track = search.get('track');

  const canvasBoxRef = useRef({ offsetWidth: 0, offsetHeight: 0 });
  const [canvasBoxWidth, setCanvasBoxWidth] = useState(0);
  const [canvasBoxHeight, setCanvasBoxHeight] = useState(0);

  const labelMode = useLabelMode();
  const canvas = useCanvas();
  const value = useSelector(labelMode, (state) => {
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
      <Box
        sx={{
          boxSizing: 'border-box',
          display: 'flex',
          flexGrow: 1,
          padding: 1,
          alignItems: 'stretch',
          justifyContent: 'space-evenly',
          minHeight: 'calc(100vh - 73px - 56px - 76px - 2px)',
        }}
      >
        <Box
          sx={{
            flex: '0 0 auto',
            padding: 1,
          }}
        >
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
        <Box
          sx={{
            flex: '0 0 auto',
            padding: 1,
          }}
        >
          <TabPanel value={value} index={0}>
            <SegmentControls />
          </TabPanel>
          <TabPanel value={value} index={1}>
            <TrackingControls />
          </TabPanel>
        </Box>
        <Box
          ref={canvasBoxRef}
          sx={{ position: 'relative', flex: '1 1 auto', maxHeight: '100vh', maxWidth: '100vw' }}
        >
          <Canvas />
        </Box>
      </Box>
    </>
  );
}

export default Label;
