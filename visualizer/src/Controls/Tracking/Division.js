import { Box, IconButton, makeStyles } from '@material-ui/core';
import Avatar from '@material-ui/core/Avatar';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import { useTheme } from '@material-ui/core/styles';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import { useSelector } from '@xstate/react';
import React, { useReducer, useRef } from 'react';
import { ArcherContainer, ArcherElement } from 'react-archer';
import {
  useFeature,
  useImage,
  useLabeled,
  useSelect,
  useTracking,
} from '../../ServiceContext';

function useColors() {
  const labeled = useLabeled();
  const featureIndex = useSelector(labeled, state => state.context.feature);
  const feature = useFeature(featureIndex);
  const colors = useSelector(feature, state => state.context.colors);
  return colors;
}

const useStyles = makeStyles(theme => ({
  division: {
    display: 'flex',
    alignItems: 'center',
  },
  daughter: {
    display: 'flex',
    alignItems: 'center',
  },
  daughters: {
    display: 'flex',
    flexDirection: 'column',
  },
  cell: {
    margin: theme.spacing(1),
    height: '40px',
    width: '40px',
  },
  addButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: '100%',
  },
}));

function Parent({ label }) {
  const tracking = useTracking();
  const division = useSelector(tracking, state => state.context.labels[label]);
  const { daughters, frame_div } = division;
  const colors = useColors();
  const color = colors[label];

  const styles = useStyles();
  const theme = useTheme();

  const strokeColor = theme.palette.secondary.main;
  const relations = daughters.map(label => ({
    targetId: `daughter${label}`,
    targetAnchor: 'left',
    sourceAnchor: 'right',
    style: { strokeColor, strokeWidth: 1, noCurves: true },
  }));
  relations.push({
    targetId: 'addDaughter',
    targetAnchor: 'left',
    sourceAnchor: 'right',
    style: { strokeColor, strokeWidth: 1, noCurves: true },
  });

  const select = useSelect();
  const image = useImage();

  const onClick = e => {
    select.send({ type: 'SET_FOREGROUND', foreground: label });
    image.send({ type: 'LOAD_FRAME', frame: frame_div - 1 });
  };

  return (
    <ArcherElement id='parent' relations={relations}>
      <Avatar
        className={styles.cell}
        style={{ backgroundColor: color }}
        onClick={onClick}
      >
        {label}
      </Avatar>
    </ArcherElement>
  );
}

function Daughter({ label, daughter, frame_div }) {
  const styles = useStyles();

  const select = useSelect();
  const image = useImage();

  const colors = useColors();

  const onClick = () => {
    select.send({ type: 'SET_FOREGROUND', foreground: daughter });
    image.send({ type: 'LOAD_FRAME', frame: frame_div });
  };

  return (
    <Box className={styles.daughter}>
      <ArcherElement id={`daughter${daughter}`}>
        <Avatar
          className={styles.cell}
          onClick={onClick}
          style={{ backgroundColor: colors[daughter] }}
        >
          {daughter}
        </Avatar>
      </ArcherElement>
      <DaughterMenu parent={label} daughter={daughter} />
    </Box>
  );
}

function AddDaughter({ label }) {
  const styles = useStyles();

  const tracking = useTracking();
  const onClick = () => tracking.send({ type: 'ADD', parent: label });

  return (
    <Box style={{ position: 'relative' }}>
      {/* point arrow to hidden Avatar so arrows look aligned */}
      <ArcherElement id='addDaughter'>
        <Avatar className={styles.cell} style={{ visibility: 'hidden' }} />
      </ArcherElement>
      <IconButton className={styles.addButton} onClick={onClick}>
        <AddCircleOutlineIcon />
      </IconButton>
    </Box>
  );
}

function DaughterMenu({ parent, daughter }) {
  const tracking = useTracking();
  const { send } = tracking;

  const [open, toggle] = useReducer(v => !v, false);
  const anchorRef = useRef(null);

  const handleRemove = () => {
    send({ type: 'REMOVE', daughter: daughter });
    toggle();
  };

  const handleNewCell = () => {
    send({ type: 'REPLACE_WITH_NEW_CELL', daughter: daughter });
    toggle();
  };

  const handleParent = () => {
    send({ type: 'REPLACE_WITH_PARENT', parent: parent, daughter: daughter });
    toggle();
  };

  const styles = useStyles();
  return (
    <>
      <IconButton
        aria-label='Edit daughter'
        size='small'
        onClick={toggle}
        ref={anchorRef}
      >
        <MoreVertIcon fontSize='small' />
      </IconButton>
      <Popper open={open} anchorEl={anchorRef.current} placement='bottom-end'>
        <Paper>
          <ClickAwayListener onClickAway={toggle}>
            <MenuList id='channel-options'>
              <MenuItem onClick={handleRemove}>Remove from Division</MenuItem>
              <MenuItem onClick={handleNewCell}>Replace with New Cell</MenuItem>
              <MenuItem onClick={handleParent}>Replace with Parent</MenuItem>
            </MenuList>
          </ClickAwayListener>
        </Paper>
      </Popper>
    </>
  );
}

function Daughters({ label }) {
  const styles = useStyles();

  const tracking = useTracking();
  const division = useSelector(tracking, state => state.context.labels[label]);
  const { daughters, frame_div } = division;

  return (
    <Box className={styles.daughters}>
      {daughters.map(daughter => (
        <Daughter
          label={label}
          daughter={daughter}
          frame_div={frame_div}
          key={daughter}
        />
      ))}
      <AddDaughter label={label} />
    </Box>
  );
}

function Division({ label }) {
  const styles = useStyles();

  const tracking = useTracking();
  const division = useSelector(tracking, state => state.context.labels[label]);

  return (
    <ArcherContainer>
      <Box className={styles.division}>
        {division && <Parent label={label} />}
        {division && <Daughters label={label} />}
      </Box>
    </ArcherContainer>
  );
}

export default Division;
