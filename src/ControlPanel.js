import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';

import { useService } from '@xstate/react';
import { labelService } from './service';

const useRowStyles = makeStyles({
  root: {
    '& > *': {
      borderBottom: 'unset',
    },
  },
  slider: {
    width: 300,
  },
});


function ControlRow(props) {
  const { name, header, children } = props;
  const [open, setOpen] = React.useState(false);
  const classes = useRowStyles();

  const [current, send] = useService(labelService);

  return (
    <>
      <TableRow className={classes.root}>
        <TableCell>
          <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {name}
        </TableCell>
        <TableCell component="th" scope="row">
          {header}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            {children}
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

export default function ControlPanel() {
  return (
    <TableContainer id='control-panel' component={Paper}>
      <Table aria-label="collapsible table">
        <TableBody>
          <ControlRow name={"Slice"} header={"Frame: 0"}>
            {"Frame Slider"}
          </ControlRow>
          <ControlRow name={"Display"} header={"highlight: on"}>
            {"Highlight button"}
          </ControlRow>
          <ControlRow name={"Label"} header={"label: 1"}/>
          <ControlRow name={"Tool"} header={"brush"}/>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
