import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';
import React from 'react';
import ActionInstructions from './ActionInstructions';
import CanvasInstructions from './CanvasInstructions';
import CellsInstructions from './CellsInstructions';
import DisplayInstructions from './DisplayInstructions';
import OverviewInstructions from './OverviewInstructions';
import SegmentInstructions from './SegmentInstructions';
import SelectInstructions from './SelectInstructions';

const PREFIX = 'Instructions';

const classes = {
  root: `${PREFIX}-root`,
  expanded: `${PREFIX}-expanded`,
  root2: `${PREFIX}-root2`,
  content: `${PREFIX}-content`,
  expanded2: `${PREFIX}-expanded2`,
  root3: `${PREFIX}-root3`,
};

const Root = styled('div')(({ theme }) => ({
  [`& .${classes.root}`]: {
    border: '1px solid rgba(0, 0, 0, .125)',
    boxShadow: 'none',
    '&:not(:last-child)': {
      borderBottom: 0,
    },
    '&:before': {
      display: 'none',
    },
    '&$expanded': {
      m: 'auto',
    },
  },

  [`& .${classes.expanded}`]: {},

  [`& .${classes.root2}`]: {
    backgroundColor: 'rgba(0, 0, 0, .03)',
    borderBottom: '1px solid rgba(0, 0, 0, .125)',
    mb: -1,
    minHeight: 56,
    '&$expanded': {
      minHeight: 56,
    },
  },

  [`& .${classes.content}`]: {
    '&$expanded': {
      m: '12px 0',
    },
  },

  [`& .${classes.expanded2}`]: {},
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <Root
      role='tabpanel'
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          <Typography component='div'>{children}</Typography>
        </Box>
      )}
    </Root>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
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
    if (event.key === ' ') {
      event.preventDefault();
    }
  };

  return (
    <div>
      <Accordion
        square
        expanded={expanded}
        onChange={toggleExpanded}
        TransitionProps={{ unmountOnExit: true }}
        classes={{
          root: classes.root,
          expanded: classes.expanded,
        }}
      >
        <AccordionSummary
          aria-controls='panel1d-content'
          id='panel1d-header'
          onKeyUp={stopExpansion}
          classes={{
            root: classes.root2,
            content: classes.content,
            expanded: classes.expanded2,
          }}
        >
          <Typography>Instructions (Click to expand/collapse)</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          <Tabs value={value} onChange={handleTabChange}>
            <Tab label='Overview' />
            <Tab label='Select' />
            <Tab label='Display' />
            <Tab label='Canvas' />
            <Tab label='Segment' />
            <Tab label='Cells' />
            <Tab label='Divisions' />
          </Tabs>
          <TabPanel value={value} index={0}>
            <OverviewInstructions />
          </TabPanel>
          <TabPanel value={value} index={1}>
            <SelectInstructions />
          </TabPanel>
          <TabPanel value={value} index={2}>
            <DisplayInstructions />
          </TabPanel>
          <TabPanel value={value} index={2}>
            <CanvasInstructions />
          </TabPanel>
          <TabPanel value={value} index={3}>
            <SegmentInstructions />
          </TabPanel>
          <TabPanel value={value} index={4}>
            <CellsInstructions />
          </TabPanel>
          <TabPanel value={value} index={5}>
            <ActionInstructions />
          </TabPanel>
        </AccordionDetails>
      </Accordion>
    </div>
  );
}
