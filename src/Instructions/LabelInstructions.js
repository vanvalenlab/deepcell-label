import React from 'react';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import { LabelTable } from '../ControlPanel/LabelControls';

const LabelInstructions = () => {
  return <>
    <Typography variant='h5'>
      Label
    </Typography>
    <TableContainer>
      <Table >
        <TableBody>
          <TableRow>
            <TableCell width='300px' align='center'><LabelTable /></TableCell>
            <TableCell>
              <Typography>
                The Label panel shows us a table about which labels we are viewing on the canvas.
                We can see the currently selected label, the label underneath the cursor, and the cursor coordinates in pixels.
                Click on a label to select or unselect it. We can also press <kbd>Esc</kbd> to unselect a label from anywhere.
                Press <kbd>[</kbd> or <kbd>]</kbd> to cycle through and select each label in order.
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  </>;
};

export default LabelInstructions;