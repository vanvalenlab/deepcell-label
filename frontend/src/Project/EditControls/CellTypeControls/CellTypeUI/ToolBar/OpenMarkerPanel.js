import TableChartTwoToneIcon from '@mui/icons-material/TableChartTwoTone';
import { IconButton, Tooltip } from '@mui/material';
import { bind, unbind } from 'mousetrap';
import { useCallback, useEffect, useState } from 'react';
import MarkerPanelModal from '../MarkerPanelModal';

function OpenMarkerPanel() {
  const [panelOpen, setPanelOpen] = useState(false);

  const handlePanelModal = useCallback(() => {
    panelOpen ? setPanelOpen(false) : setPanelOpen(true);
  }, [panelOpen]);

  useEffect(() => {
    bind('p', handlePanelModal);
    return () => {
      unbind('p', handlePanelModal);
    };
  }, [handlePanelModal]);

  return (
    <>
      <Tooltip
        title={
          <span>
            Open Marker Panel <kbd>P</kbd>
          </span>
        }
        placement='top'
      >
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
