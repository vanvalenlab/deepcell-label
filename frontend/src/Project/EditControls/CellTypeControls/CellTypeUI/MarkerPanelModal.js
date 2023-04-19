import { Chip, TextField } from '@mui/material';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import { DataGrid, useGridApiContext } from '@mui/x-data-grid';
import { useSelector } from '@xstate/react';
import { useRef } from 'react';
import { useRaw } from '../../../ProjectContext';
import { markerPanel } from './CellMarkerPanel';

const columns = [
  {
    field: 'names',
    headerName: 'Cell Type Names',
    width: 300,
    editable: true,
    renderCell: (params) => <CellTypes {...params} />,
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

function Channels(props) {
  const { value } = props;
  const raw = useRaw();
  const channelNames = useSelector(raw, (state) => state.context.channelNames);
  const backgroundColor = 'rgba(40,150,240,0.2)';
  const textColor = 'rgba(40,140,250,1)';
  return (
    <Grid container spacing={1}>
      {value.map((channel, i) => (
        <Grid item xs={1.5} key={i}>
          <Chip
            sx={
              channelNames.includes(channel)
                ? { width: '100%', backgroundColor: backgroundColor, color: textColor }
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

function CellTypes(props) {
  const { value } = props;
  return value.map((cellType, i) => (
    <Chip
      sx={{ marginLeft: i == 0 ? 0 : 1 }}
      label={cellType}
      variant='outlined'
      size='small'
      color='success'
    />
  ));
}

function EditChannels(props) {
  const { id, value, field } = props;
  const apiRef = useGridApiContext();
  const focusRef = useRef(null);

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

  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <Box sx={style} display='flex'>
        <Grid container item direction='column' spacing={'4vh'}>
          <Grid item>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant='h6' component='h2'>
                Marker Panel
              </Typography>
            </Box>
          </Grid>
          <Grid item sx={{ height: '70%', width: '100%' }}>
            <DataGrid
              rows={markerPanel}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 10,
                  },
                },
              }}
              pageSizeOptions={[10]}
            />
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
}

export default MarkerPanelModal;
