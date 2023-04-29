import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import { IconButton } from '@mui/material';
import { useState } from 'react';
import MarkerPanelModal from './MarkerPanelModal';

function OpenMarkerPanel() {
  const [panelOpen, setPanelOpen] = useState(false);

  const handlePanelModal = () => {
    setPanelOpen(true);
  };

  return (
    <>
      <IconButton sx={{ marginLeft: 2 }} onClick={handlePanelModal}>
        <AppRegistrationIcon />
      </IconButton>
      <MarkerPanelModal open={panelOpen} setOpen={setPanelOpen} />
    </>
  );
}

export default OpenMarkerPanel;
