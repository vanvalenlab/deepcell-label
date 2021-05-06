import React from 'react';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import { InvertButton, GrayscaleButton, BrightnessSlider, ContrastSlider } from '../ControlPanel/ChannelControls';
import { useChannel } from '../ServiceContext';


const RawDisplayInstructions = () => {
  const channel = useChannel();

  return <>
    <Typography variant='h5'>
      Raw Display
    </Typography>
    <TableContainer>
      <Table >
        <TableBody>
          <TableRow>
            <TableCell width='200px' align='center'><InvertButton /></TableCell>
            <TableCell>
              <Typography>
                The invert button inverts the raw image so the light areas become dark and vice versa.
                Inverting can help reveal objects under the label overlay.
                Press <kbd>I</kbd> to invert the raw image.
              </Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell align='center'><GrayscaleButton /></TableCell>
            <TableCell>
              <Typography>
                The grayscale button makes the raw image black and white.
                A black and white image lets us clearly see the colored label overlay.
              </Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>{channel && <BrightnessSlider />}</TableCell>
            <TableCell>
              <Typography>
                The brightness slider makes the raw image lighter or darker.
                A brightness of -1 makes the image all black, and
                a brightness to +1 makes the image all white.
                Double click on the slider to reset it to 0.
              </Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>{channel && <ContrastSlider />}</TableCell>
            <TableCell>
              <Typography>
                The contrast slider adjusts the contrast from -1 to +1.
                Increasing contrast improves the visibility of objects in the raw image.
                Double click on the slider to reset it to 0.
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  </>;
};

export default RawDisplayInstructions;
