import React from 'react';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import { useImage } from '../ServiceContext';
import { useSelector } from '@xstate/react';
import { ChannelSlider, FeatureSlider, FrameSlider } from '../ControlPanel/ImageControls';


const FrameInstructions = () => {
  return <TableRow>
    <TableCell width='200px'><FrameSlider /></TableCell>
    <TableCell>
      <Typography>
        The frame slider controls which frame we view in an 3D image stack or time series.
        Frames move through space for 3D image stacks or through time for timelapses.
        Press <kbd>D</kbd> or <kbd>&rarr;</kbd> to view the next frame.
        Press <kbd>A</kbd> or <kbd>&larr;</kbd> to view the previous frame.
      </Typography>
    </TableCell>
  </TableRow>;
}

const ChannelInstructions = () => {
  return <TableRow>
    <TableCell><ChannelSlider /></TableCell>
    <TableCell>
      <Typography>
        The channel slider controls which channel we view.
        Each channel can be a marker, like nuclear or cytoplasm,
        or different imaging modalities, like fluorescence or phase.
        Press <kbd>C</kbd> to view the next channel.
        Press <kbd>Shift</kbd> + <kbd>C</kbd> to view the previous channel.
      </Typography>
    </TableCell>
  </TableRow>;
}

const FeatureInstructions = () => {
  return <TableRow>
    <TableCell><FeatureSlider /></TableCell>
    <TableCell>
      <Typography>
        The features slider controls which segmentation we view.
        Each feature labels a type of object, like a whole-cell segmentation or a nuclear segmentation.
        Press <kbd>F</kbd> to view the next feature.
        Press <kbd>Shift</kbd> + <kbd>F</kbd> to view the previous feature.
      </Typography>
    </TableCell>
  </TableRow>;
}

const ImageControlInstructions = () => {
  const image = useImage();
  const numFrames = useSelector(image, state => state.context.numFrames);
  const numChannels = useSelector(image, state => state.context.numChannels);
  const numFeatures = useSelector(image, state => state.context.numFeatures);
  
  return <>
    <Typography variant='h5'>
      Image
    </Typography>
    <TableContainer>
      <Table >
        <TableBody>
          { numFrames > 1 && <FrameInstructions />}
          { numChannels > 1 && <ChannelInstructions />}
          { numFeatures > 1 && <FeatureInstructions />}
        </TableBody>
      </Table>
    </TableContainer>
  </>;
};

export default ImageControlInstructions;
