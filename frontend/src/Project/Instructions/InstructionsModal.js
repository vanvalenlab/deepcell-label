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
import PlottingTrainingInstructions from './PlottingTrainingInstructions';
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
  display: 'flex',
  flexDirection: 'column',
};

const tabPanelStyle = {
  height: '75vh',
  overflow: 'hidden',
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  '&::-webkit-scrollbar-thumb': {
    borderRadius: 10,
    backgroundColor: 'rgba(100,100,100,0.5)',
  },
};

export default function InstructionsModal({ open, setOpen }) {
  const [value, setValue] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Modal id={'instructions-modal'} open={open} onClose={() => setOpen(false)}>
      <Box sx={style}>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            position: 'relative',
          }}
        >
          <Tabs variant='scrollable' scrollButtons='auto' value={value} onChange={handleTabChange}>
            <Tab label='Overview' />
            <Tab label='Select' />
            <Tab label='Canvas' />
            <Tab label='Display' />
            <Tab label='Segment' />
            <Tab label='Cells' />
            <Tab label='Divisions' />
            <Tab label='Cell Types' />
            <Tab label='Plotting / Training' />
          </Tabs>
        </Box>
        <TabPanel value={value} index={0} sx={tabPanelStyle}>
          <OverviewInstructions />
        </TabPanel>
        <TabPanel value={value} index={1} sx={tabPanelStyle}>
          <SelectInstructions />
        </TabPanel>
        <TabPanel value={value} index={2} sx={tabPanelStyle}>
          <CanvasInstructions />
        </TabPanel>
        <TabPanel value={value} index={3} sx={tabPanelStyle}>
          <DisplayInstructions />
        </TabPanel>
        <TabPanel value={value} index={4} sx={tabPanelStyle}>
          <SegmentInstructions />
        </TabPanel>
        <TabPanel value={value} index={5} sx={tabPanelStyle}>
          <CellsInstructions />
        </TabPanel>
        <TabPanel value={value} index={6} sx={tabPanelStyle}>
          <DivisionsInstructions />
        </TabPanel>
        <TabPanel value={value} index={7} sx={tabPanelStyle}>
          <CellTypeInstructions />
        </TabPanel>
        <TabPanel value={value} index={8} sx={tabPanelStyle}>
          <PlottingTrainingInstructions />
        </TabPanel>
      </Box>
    </Modal>
  );
}
