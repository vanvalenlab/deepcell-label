import { Chip, TextField } from '@mui/material';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import { DataGrid, useGridApiContext } from '@mui/x-data-grid';
import { useSelector } from '@xstate/react';
import Fuse from 'fuse.js';
import { useRef } from 'react';
import { useCellTypes, useRaw } from '../../../ProjectContext';
import { hexToRgb } from '../../../service/labels/cellTypesMachine';

const columns = [
  {
    field: 'names',
    headerName: 'Cell Type Names',
    width: 400,
    editable: true,
    renderCell: (params) => <CellTypes {...params} />,
    renderEditCell: (params) => <EditCellTypes {...params} />,
  },
  {
    field: 'channels',
    headerName: 'Relevant Channels (Exact Match)',
    width: 600,
    editable: true,
    renderCell: (params) => <Channels {...params} />,
    renderEditCell: (params) => <EditChannels {...params} />,
  },
];

// Component for rendering the channels column in the table
function Channels(props) {
  const { value } = props;
  const raw = useRaw();
  const channelNames = useSelector(raw, (state) => state.context.channelNames);
  const backgroundColor = 'rgba(40,140,250,0.2)';
  const textColor = 'rgba(40,140,250,1)';
  return (
    <Grid container spacing={1}>
      {value.map((channel, i) => (
        <Grid item xs={1.5} key={i}>
          <Chip
            sx={
              channelNames.includes(channel)
                ? {
                    width: '100%',
                    backgroundColor: backgroundColor,
                    color: textColor,
                    fontWeight: 450,
                  }
                : { width: '100%' }
            }
            label={channel}
            variant='contained'
            size='small'
            color={channelNames.includes(channel) ? 'primary' : 'default'}
          />
        </Grid>
      ))}
    </Grid>
  );
}

// Component for rendering the cell type names column
function CellTypes(props) {
  const { value } = props;
  const cellTypes = useCellTypes();
  const cellTypesList = useSelector(cellTypes, (state) => state.context.cellTypes);
  let backgroundColor = null;
  let textColor = null;

  const options = {
    includeScore: true,
  };
  const fuse = new Fuse(value, options);
  let minScore = Infinity;
  let closestColor = null;
  for (let cellType of cellTypesList) {
    const topResult = fuse.search(cellType.name)[0];
    if (topResult && topResult.score < minScore) {
      minScore = topResult.score;
      closestColor = cellType.color;
    }
  }
  if (minScore <= 0.1) {
    const rgb = hexToRgb(closestColor);
    backgroundColor = `rgba(${rgb[0] * 255},${rgb[1] * 255},${rgb[2] * 255},0.2)`;
    textColor = `rgba(${rgb[0] * 200},${rgb[1] * 200},${rgb[2] * 200}, 1)`;
  }

  return value.map((cellType, i) => (
    <Chip
      key={i}
      sx={{
        marginLeft: i === 0 ? 0 : 1,
        color: textColor,
        backgroundColor: backgroundColor,
        fontWeight: 450,
      }}
      label={cellType}
      size='small'
    />
  ));
}

// Component for enabling text field editing for cells in the channels column
function EditChannels(props) {
  const { id, value, field } = props;
  const apiRef = useGridApiContext();
  const focusRef = useRef(null);
  const cellTypes = useCellTypes();

  const handleValueChange = (event) => {
    const newValue = event.target.value.split(',');
    apiRef.current.setEditCellValue({ id, field, value: newValue });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      focusRef.current.blur();
    }
    event.stopPropagation();
  };

  // Handler for when text is finished being typed (hit enter or click away)
  const handleBlur = () => {
    cellTypes.send({ type: 'EDIT_MARKER_PANEL', id: id, field: 'channels', data: value });
    apiRef.current.stopCellEditMode({ id, field });
  };

  return (
    <TextField
      sx={{ width: '100%' }}
      value={value}
      autoFocus={true}
      inputRef={focusRef}
      onBlur={handleBlur}
      onChange={handleValueChange}
      onKeyDown={handleKeyDown}
    />
  );
}

// Component for enabling text field editing for cells in the cell types column
function EditCellTypes(props) {
  const { id, value, field } = props;
  const apiRef = useGridApiContext();
  const focusRef = useRef(null);
  const cellTypes = useCellTypes();

  const handleValueChange = (event) => {
    const newValue = event.target.value.split(',');
    apiRef.current.setEditCellValue({ id, field, value: newValue });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      focusRef.current.blur();
    }
    event.stopPropagation();
  };

  // Handler for when text is finished being typed (hit enter or click away)
  const handleBlur = () => {
    cellTypes.send({ type: 'EDIT_MARKER_PANEL', id: id, field: 'names', data: value });
    apiRef.current.stopCellEditMode({ id, field });
  };

  return (
    <TextField
      sx={{ width: '100%' }}
      value={value}
      autoFocus={true}
      inputRef={focusRef}
      onBlur={handleBlur}
      onChange={handleValueChange}
      onKeyDown={handleKeyDown}
    />
  );
}

// Overarching modal component
function MarkerPanelModal({ open, setOpen }) {
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
  const cellTypes = useCellTypes();
  const markerPanel = useSelector(cellTypes, (state) => state.context.markerPanel);

  return (
    <Modal open={open} onClose={() => setOpen(false)} disableAutoFocus={true}>
      <Box sx={style} display='flex'>
        <Grid container item direction='column' spacing={'4vh'}>
          <Grid item>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant='h6' component='h2'>
                Marker Panel
              </Typography>
            </Box>
          </Grid>
          <Grid item>
            <Typography>
              This is the table used to match cell types with channels. Double click a cell to edit,
              and your comma-delimited input will be parsed into cell types or channels. Note that
              existing channels only match when matching exactly, but cell type names will be fuzzy
              matched.
            </Typography>
          </Grid>
          <Grid item sx={{ height: '70%', width: '100%' }}>
            <DataGrid
              rows={markerPanel}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 20,
                  },
                },
              }}
              pageSizeOptions={[10, 20, 30]}
            />
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
}

export default MarkerPanelModal;
