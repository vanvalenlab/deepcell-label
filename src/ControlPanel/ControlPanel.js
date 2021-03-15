import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableContainer from '@material-ui/core/TableContainer';
import Paper from '@material-ui/core/Paper';


import Predict from './Predict';
import ControlRow from './ControlRow';
import FrameControls from './FrameControls';
import RawControls from './RawControls';
import LabelControls from './LabelControls';


export default function ControlPanel() {
  return (
    <TableContainer id='control-panel' component={Paper}>
      <Table aria-label="collapsible table">
        <TableBody>
          <FrameControls />
          <LabelControls />
          <RawControls />
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
