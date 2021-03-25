import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableContainer from '@material-ui/core/TableContainer';
import Paper from '@material-ui/core/Paper';

import Predict from './Predict';
import ControlRow from './ControlRow';
import ImageControls from './ImageControls';
import ChannelControls from './ChannelControls';
import FeatureControls from './FeatureControls';


export default function ControlPanel() {
  return (
    <TableContainer id='control-panel' component={Paper}>
      <Table aria-label="collapsible table">
        <TableBody>
          <ImageControls />
          <ChannelControls />
          <FeatureControls />
          <ControlRow name={"Label"} />
          <ControlRow name={"Tool"} />
          <ControlRow name={"Predict"}>
            <Predict />
          </ControlRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
