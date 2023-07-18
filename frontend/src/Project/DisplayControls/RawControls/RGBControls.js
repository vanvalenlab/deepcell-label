import AddIcon from '@mui/icons-material/Add';
import { Box } from '@mui/material';
import Button from '@mui/material/Button';
import { useSelector } from '@xstate/react';
import equal from 'fast-deep-equal';
import { useEffect, useRef } from 'react';
import { useCanvas, useRaw } from '../../ProjectContext';
import LayerController from './LayerController';

// From https://stackoverflow.com/questions/68658249/how-to-do-react-horizontal-scroll-using-mouse-wheel
export function useHorizontalScroll() {
  const elRef = useRef();
  useEffect(() => {
    const el = elRef.current;
    if (el) {
      const onWheel = (e) => {
        if (e.deltaY === 0) return;
        e.preventDefault();
        el.scrollBy({
          left: e.deltaY < 0 ? -30 : 30,
        });
      };
      el.addEventListener('wheel', onWheel);
      return () => el.removeEventListener('wheel', onWheel);
    }
  }, []);
  return elRef;
}

function RGBControls({ width }) {
  const raw = useRaw();
  const layers = useSelector(raw, (state) => state.context.layers);
  const numChannels = useSelector(raw, (state) => state.context.numChannels);
  const canvasMachine = useCanvas();
  const [sw, scale] = useSelector(
    canvasMachine,
    (state) => [state.context.width, state.context.scale],
    equal
  );
  const menuWidth = width ? width : scale * sw + 355;
  const scrollRef = useHorizontalScroll();

  return (
    <Box
      ref={scrollRef}
      sx={{
        display: 'flex',
        p: 1,
        overflow: 'hidden',
        overflowX: 'auto',
        width: menuWidth,
        '&::-webkit-scrollbar': {
          height: 5,
          borderRadius: 10,
          backgroundColor: 'rgba(0,0,0,0.05)',
        },
        '&::-webkit-scrollbar-thumb': {
          borderRadius: 10,
          backgroundColor: 'rgba(100,100,100,0.5)',
        },
      }}
    >
      {layers.map((layer, index) => (
        <Box key={layer.sessionId} sx={{ minWidth: 140, marginRight: 5 }}>
          <LayerController layer={layer} />
        </Box>
      ))}
      <Box sx={{ minWidth: 140, marginTop: 0.4 }}>
        {numChannels > 1 && (
          <Button
            onClick={() => raw.send('ADD_LAYER')}
            fullWidth
            variant='outlined'
            sx={{ borderStyle: 'dashed', p: 0.5 }}
            startIcon={<AddIcon />}
            size='small'
          >
            Add Channel
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default RGBControls;
