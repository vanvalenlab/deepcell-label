import { Box, makeStyles, Typography } from '@material-ui/core';
import { useSelector } from '@xstate/react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Footer from './Footer/Footer';
import Label from './Label';
import Load from './Load/Load';
import ProjectContext from './ProjectContext';
import QualityControlContext from './QualityControlContext';
import { isProjectId, project, qualityControl } from './service/service';

// import service from './service/service';

// inspect({
//   // options
//   // url: 'https://statecharts.io/inspect', // (default)
//   iframe: false // open in new window
// });

const useStyles = makeStyles(theme => ({
  root: {
    boxSizing: 'border-box',
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column',
  },
  main: {
    boxSizing: 'border-box',
    display: 'flex',
    flexGrow: 1,
    flexDirection: 'column',
    padding: theme.spacing(2),
    alignItems: 'center',
  },
}));

function Review() {
  const project = useSelector(qualityControl, state => {
    const { projectId, projects } = state.context;
    return projects[projectId];
  });

  return (
    <QualityControlContext qualityControl={qualityControl}>
      <ProjectContext project={project}>
        <Label review={true} />
      </ProjectContext>
    </QualityControlContext>
  );
}

function LabelProject() {
  return (
    <ProjectContext project={project}>
      <Label review={false} />
    </ProjectContext>
  );
}

function InvalidProjectId() {
  const styles = useStyles();
  const id = new URLSearchParams(window.location.search).get('projectId');

  return (
    <Box className={styles.main}>
      <Typography>
        <tt>{id}</tt> is not a valid project ID.
      </Typography>
      <Typography>
        Use a 12 character ID in your URL with only <tt>_</tt>, <tt>-</tt>, letters or numbers like{' '}
        <tt>projectId=abc-ABC_1234</tt>.
      </Typography>
    </Box>
  );
}

function App() {
  const styles = useStyles();
  const id = new URLSearchParams(window.location.search).get('projectId');

  return (
    <Router>
        <Switch>
          <Route path='/project'>
            {isProjectId(id) ? (
              <LabelProject />
            ) : id?.split(',')?.every(isProjectId) ? (
              <Review />
            ) : (
              <InvalidProjectId />
            )}
          </Route>
          <Route path='/'>
            <Load />
          </Route>
        </Switch>
    </Router>
  );
}

export default App;
