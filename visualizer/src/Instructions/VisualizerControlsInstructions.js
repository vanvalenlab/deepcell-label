import React from 'react';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';

import { FeatureRadioButtons } from '../ControlPanel/VisualizerControls';
import { OutlineRadioButtons } from '../ControlPanel/FeatureControls';
import { ChannelSliders } from '../ControlPanel/RGBControls';

const VisualizerControlsInstructions = () => {
  return <>
    <TableContainer>
      <Table >
        <TableRow>
          <TableCell>
            <ChannelSliders />
          </TableCell>
          <TableCell>
            <Typography>
              These sliders adjust the dynamic range of each channel.
              Increasing the minimum value makes the channel darker.
              Decreasing the maximum value makes the channel lighter.
            </Typography>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <FeatureRadioButtons />
          </TableCell>
          <TableCell>
            <Typography>
              Here we can select which segmentation to view, either whole-cell or nuclear.
            </Typography>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <OutlineRadioButtons />
          </TableCell>
          <TableCell>
            <Typography>
              Here we can select how many cells are outlined, either all cells, only one selected cell, or no cells.
              We can select a cell by clicking it.
            </Typography>
          </TableCell>
        </TableRow>
      </Table>
    </TableContainer>
  </>;
};

export default VisualizerControlsInstructions;
