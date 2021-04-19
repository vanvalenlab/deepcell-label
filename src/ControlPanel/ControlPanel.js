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
import LabelControls from './LabelControls';
import ToolControls from './ToolControls';

import { useImage } from '../ServiceContext';
import { useSelector } from '@xstate/react';


export default function ControlPanel() {
  const image = useImage();
  const channels = useSelector(image, state => state.context.channels);
  const channel = useSelector(image, state => state.context.channel);
  const features = useSelector(image, state => state.context.features);
  const feature = useSelector(image, state => state.context.feature);

  return (
    <TableContainer id='control-panel' component={Paper}>
      <Table aria-label="collapsible table">
        <TableBody>
          <ImageControls />
          {channels[channel] && <ChannelControls channel={channels[channel]} />}
          {features[feature] && <FeatureControls feature={features[feature]} />}
          <LabelControls />
          <ToolControls />
          <ControlRow name={"Predict"}>
            <Predict />
          </ControlRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
