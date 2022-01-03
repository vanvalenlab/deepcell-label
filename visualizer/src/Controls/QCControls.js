import { Box, makeStyles } from '@material-ui/core';
import ExportQualityControlButton from './QualityControl/ExportQualityControlButton';
import ProjectSelect from './QualityControl/ProjectSelect';
import ReviewButtons from './QualityControl/ReviewButtons';

const useStyles = makeStyles((theme) => ({
  qualityControl: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    // width: '100%',
    padding: theme.spacing(1),
  },
}));

function QualityControl() {
  const styles = useStyles();

  return (
    <Box className={styles.qualityControl}>
      <ProjectSelect />
      <ReviewButtons />
      <ExportQualityControlButton />
    </Box>
  );
}

export default QualityControl;
