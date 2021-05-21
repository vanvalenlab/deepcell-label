import React from 'react';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
// import { HighlightButton, ShowNoLabelButton, OutlineRadioButtons, OpacitySlider } from '../ControlPanel/FeatureControls';


const LabelDisplayInstructions = () => {
  return <>
    {/* <Typography variant='h5'>
      Label Display
    </Typography>
    <TableContainer>
      <Table >
        <TableBody>
          <TableRow>
            <TableCell width='200px' align='center'><HighlightButton /></TableCell>
            <TableCell>
              <Typography>
                The highlight button toggles whether the selected label is shown in red.
                Press <kbd>H</kbd> to toggle highlighting.
              </Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell align='center'><ShowNoLabelButton /></TableCell>
            <TableCell>
              <Typography>
                The Hide Unlabeled Area button toggles whether pixels with no label are black or transparent.
              </Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell><OutlineRadioButtons /></TableCell>
            <TableCell>
              <Typography>
                These buttons select whether to outline all the labels, only the selected label, or no labels.
              </Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell><OpacitySlider /></TableCell>
            <TableCell>
              <Typography>
                The Opacity slider controls the transparency of the segmentation over the raw image.
                Opacity only affects the colored overlay, not the outlines.
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer> */}
  </>;
};

export default LabelDisplayInstructions;
