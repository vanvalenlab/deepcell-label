import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import MuiAccordion from '@material-ui/core/Accordion';
import MuiAccordionSummary from '@material-ui/core/AccordionSummary';
import MuiAccordionDetails from '@material-ui/core/AccordionDetails';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';

import ImageControlInstructions from './ImageControlInstructions';
import RawDisplayInstructions from './RawDisplayInstructions';
import LabelDisplayInstructions from './LabelDisplayInstructions';
import LabelInstructions from './LabelInstructions';
import CanvasInstructions from './CanvasInstructions';
import VisualizerControlsInstructions from './VisualizerControlsInstructions';


function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};


const Accordion = withStyles({
  root: {
    border: '1px solid rgba(0, 0, 0, .125)',
    boxShadow: 'none',
    '&:not(:last-child)': {
      borderBottom: 0,
    },
    '&:before': {
      display: 'none',
    },
    '&$expanded': {
      margin: 'auto',
    },
  },
  expanded: {},
})(MuiAccordion);

const AccordionSummary = withStyles({
  root: {
    backgroundColor: 'rgba(0, 0, 0, .03)',
    borderBottom: '1px solid rgba(0, 0, 0, .125)',
    marginBottom: -1,
    minHeight: 56,
    '&$expanded': {
      minHeight: 56,
    },
  },
  content: {
    '&$expanded': {
      margin: '12px 0',
    },
  },
  expanded: {},
})(MuiAccordionSummary);

const AccordionDetails = withStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
  },
}))(MuiAccordionDetails);

const ControlPanelInstructions = () => {
  return <>
    <ImageControlInstructions />
    <RawDisplayInstructions />
    <LabelDisplayInstructions />
    <LabelInstructions />
  </>;
};

export default function Instructions() {
  const [expanded, setExpanded] = React.useState(false);

  const [value, setValue] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setValue(newValue);
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const stopExpansion = (event) => {
    if (event.key === ' ') { event.preventDefault();}
  }

  return (
    <div>
      <Accordion
        square
        expanded={expanded}
        onChange={toggleExpanded}
        TransitionProps={{ unmountOnExit: true }}
      >
        <AccordionSummary
          aria-controls="panel1d-content"
          id="panel1d-header"
          onKeyUp={stopExpansion}
        >
          <Typography>Instructions (Click to expand/collapse)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Tabs
            value={value}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Controls" />
            <Tab label="Canvas" />
            {/* <Tab label="Tools" />
            <Tab label="Actions" />
            <Tab label="Select Labels" /> */}
          </Tabs>
          <TabPanel value={value} index={0}>
            {/* <ControlPanelInstructions /> */}
            <VisualizerControlsInstructions />
          </TabPanel>
          <TabPanel value={value} index={1}>
            <CanvasInstructions />
          </TabPanel>
        </AccordionDetails>
      </Accordion>
    </div>
  );
}