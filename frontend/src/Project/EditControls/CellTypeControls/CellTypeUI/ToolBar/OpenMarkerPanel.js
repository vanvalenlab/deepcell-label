import TableChartTwoToneIcon from '@mui/icons-material/TableChartTwoTone';
import { IconButton, Tooltip } from '@mui/material';
import { useState } from 'react';
import MarkerPanelModal from '../MarkerPanelModal';

function OpenMarkerPanel() {
  const [panelOpen, setPanelOpen] = useState(false);

  const handlePanelModal = () => {
    setPanelOpen(true);
  };

  return (
    <>
      <Tooltip title='Marker Panel'>
        <IconButton
          color='primary'
          sx={{ width: '100%', borderRadius: 1 }}
          onClick={handlePanelModal}
        >
          <TableChartTwoToneIcon />
        </IconButton>
      </Tooltip>
      <MarkerPanelModal open={panelOpen} setOpen={setPanelOpen} />
    </>
  );
}

export default OpenMarkerPanel;
