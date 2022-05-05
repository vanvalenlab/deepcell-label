import UndoRedo from '../SegmentControls/UndoRedo';
import DivisionAlerts from './Alerts/DivisionAlerts';
import Timeline from './Timeline';

function TrackingControls() {
  return (
    <>
      <UndoRedo />
      <DivisionAlerts />
      <Timeline />
    </>
  );
}

export default TrackingControls;
