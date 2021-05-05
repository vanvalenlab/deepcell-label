import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import { useSelector } from '@xstate/react';


import ControlRow from './ControlRow';
import { useTool, useFeature } from '../ServiceContext';

export const LabelTable = () => {
  const tool = useTool();
  const foreground = useSelector(tool, state => state.context.foreground);
  const label = useSelector(tool, state => state.context.label);
  const x = useSelector(tool, state => state.context.x);
  const y = useSelector(tool, state => state.context.y);

  return <>
    <TableContainer size="small">
      <Table >
        <TableBody>
          <TableRow>
            <TableCell component="th" scope="row">selected label:</TableCell>
            <TableCell align="right">{foreground === 0 ? 'no label' : foreground}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row">cursor over label:</TableCell>
            <TableCell align="right">{label === 0 ? 'no label' : label}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row">cursor x coordinate:</TableCell>
            <TableCell align="right">{x}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row">cursor y coordinate:</TableCell>
            <TableCell align="right">{y}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  </>;

};

const LabelsInfo = () => {
  const feature = useFeature();
  const labels = useSelector(feature, state => state.context.semanticInstanceLabels);
  const maxLabel = labels.length === 0 ? 0 : Math.max(...Object.keys(labels).map(Number));

  return <Typography gutterBottom>
    maxLabel: {maxLabel}
  </Typography>

};


export default function LabelControls() {
  return (
    <ControlRow name={"Label"}>
      <LabelTable/>
    </ControlRow>
  );
}
