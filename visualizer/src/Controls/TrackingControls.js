import { useLabeled } from '../ProjectContext';
import UndoRedo from './Segment/UndoRedo';
import DivisionAlerts from './Tracking/Alerts/DivisionAlerts';
import Timeline from './Tracking/Timeline';

function TrackingControls() {
  const labeled = useLabeled();
  return (
    <>
      <UndoRedo />
      <DivisionAlerts />
      {labeled && <Timeline />}
    </>
  );
}

export default TrackingControls;
