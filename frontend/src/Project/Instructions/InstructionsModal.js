import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import { styled } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';
import React from 'react';
import CanvasInstructions from './CanvasInstructions';
import CellsInstructions from './CellsInstructions';
import CellTypeInstructions from './CellTypeInstructions';
import DisplayInstructions from './DisplayInstructions';
import DivisionsInstructions from './DivisionsInstructions';
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

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80vw',
  height: '80vh',
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

export default function InstructionsModal({ open, setOpen }) {
  const [value, setValue] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <Box sx={style} display='flex'>
        <Tabs value={value} onChange={handleTabChange}>
          <Tab label='Overview' />
          <Tab label='Select' />
          <Tab label='Canvas' />
          <Tab label='Display' />
          <Tab label='Segment' />
          <Tab label='Cells' />
          <Tab label='Divisions' />
          <Tab label='Cell Types' />
        </Tabs>
        <TabPanel value={value} index={0}>
          <OverviewInstructions />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <SelectInstructions />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <CanvasInstructions />
        </TabPanel>
        <TabPanel value={value} index={3}>
          <DisplayInstructions />
        </TabPanel>
        <TabPanel value={value} index={4}>
          <SegmentInstructions />
        </TabPanel>
        <TabPanel value={value} index={5}>
          <CellsInstructions />
        </TabPanel>
        <TabPanel value={value} index={6}>
          <DivisionsInstructions />
        </TabPanel>
        <TabPanel value={value} index={7}>
          <CellTypeInstructions />
        </TabPanel>
      </Box>
    </Modal>
  );
}
