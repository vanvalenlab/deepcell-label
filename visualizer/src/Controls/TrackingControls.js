import UndoRedo from './Segment/UndoRedo';
import DivisionAlerts from './Tracking/Alerts/DivisionAlerts';
import Timeline from './Tracking/Timeline';

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
