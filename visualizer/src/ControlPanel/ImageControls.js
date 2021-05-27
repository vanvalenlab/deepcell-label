import React from 'react';
import { useSelector } from '@xstate/react';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import TableContainer from '@material-ui/core/TableContainer';

import DiscreteSlider from './DiscreteSlider';
import { useImage, useRaw, useLabeled } from '../ServiceContext';

import RawController from './RawController';
import LabeledController from './LabeledController';


export const FrameSlider = () => {
  const image = useImage();
  const frame = useSelector(image, state => state.context.frame);
  const numFrames = useSelector(image, state => state.context.numFrames);

  const handleFrameChange = (event, newValue) => {
    if (newValue !== frame) {
      image.send({ type: 'LOADFRAME', frame: newValue });
    }
  };

  return numFrames > 1 &&
    <DiscreteSlider
      label="Frame"
      value={frame}
      max={numFrames - 1}
      onChange={handleFrameChange}
    />;
};

const ImageControls = () => {
  const raw = useRaw();
  const labeled = useLabeled();

  return (
    <TableContainer id='control-panel' style={{overflow: 'hidden'}}>
      <TableRow>
        <TableCell>
          <FrameSlider />
        </TableCell>
      </TableRow>
      <TableRow >
        <TableCell>
          {labeled && <LabeledController />}
        </TableCell>
      </TableRow>
      <TableRow >
        <TableCell>
          {raw && <RawController />}
        </TableCell>
      </TableRow>
    </TableContainer>
  );
};

export default ImageControls;
