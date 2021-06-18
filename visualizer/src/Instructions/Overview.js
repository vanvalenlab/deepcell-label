import MuiAccordion from '@material-ui/core/Accordion';
import MuiAccordionDetails from '@material-ui/core/AccordionDetails';
import MuiAccordionSummary from '@material-ui/core/AccordionSummary';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import React from 'react';

const Overview = () => {
  return (
    <>
      <Typography>
        DeepCell Label is a tool for correcting labels on biological images.
        <br />
        Label shows an Control Panel on the left and an interactive Canvas on
        the right
        <br />
        See the Control Panel and the Canvas tab for their controls.
        <br />
        {/* We edit the labels by selecting them and then by clicking on the canvas, or pressing keybinds.
      See the Select Labels, Tools, and Actions tabs to learn more. */}
      </Typography>
    </>
  );
};

export default Overview;
