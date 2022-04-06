import { Box, createTheme, StyledEngineProvider, ThemeProvider, Typography } from '@mui/material';
import { styled } from '@mui/system';
import { useMachine, useSelector } from '@xstate/react';
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { interpret } from 'xstate';
import Footer from './Footer';
import Label from './Label';
import Load from './Load';
import NavBar from './Navbar';
import ProjectContext from './ProjectContext';
import ReviewContext from './ReviewContext';
import createLoadMachine from './service/loadMachine';
import createLoadSpotsMachine from './service/loadSpotsMachine';
import createProjectMachine from './service/projectMachine';
import createReviewMachine from './service/reviewMachine';

// inspect({
//   // options
//   // url: 'https://statecharts.io/inspect', // (default)
//   iframe: false // open in new window
// });

const Div = styled('div')``;

const theme = createTheme();

function isProjectId(id) {
  // Checks id is a 12 character URL-safe base64 string
  // URL-safe base 64 uses - instead of + and _ instead of /
  const projectIdRegex = /^[\w-]{12}$/;
  return projectIdRegex.test(id);
}

function isReview(ids) {
  // Checks ids is a comma separated list of project IDs
  return ids.split(',').every(isProjectId);
}

function Review({ ids }) {
  const reviewMachine = useState(createReviewMachine(ids.split(',')));
  const review = useMachine(reviewMachine);
  const project = useSelector(review, (state) => {
    const { projectId, projects } = state.context;
    return projects[projectId];
  });

  return (
    <ReviewContext review={review}>
      <ProjectContext project={project}>
        <Label review={true} />
      </ProjectContext>
    </ReviewContext>
  );
}

function getProjectId() {
  const location = window.location;
  const search = new URLSearchParams(location.search);
  const projectId = search.get('projectId');
  if (!projectId || projectId.split(',').length > 1) {
    return;
  }
  return projectId;
}

function LabelProject() {
  const projectId = getProjectId();
  const [loadMachine] = useState(
    process.env.REACT_APP_SPOTS_VISUALIZER === 'true'
      ? createLoadSpotsMachine(projectId)
      : createLoadMachine(projectId)
  );
  const [load] = useMachine(loadMachine);
  const [project] = useState(interpret(createProjectMachine(projectId)).start());
  window.dcl = project;
  window.loadMachine = load;

  useEffect(() => {
    if (load.matches('loaded')) {
      const { rawArrays, labeledArrays, labels, spots } = load.context;
      project.send({
        type: 'LOADED',
        rawArrays,
        labeledArrays,
        labels,
        spots: process.env.REACT_APP_SPOTS_VISUALIZER === 'true' ? spots : undefined,
      });
    }
  }, [load, project]);

  return (
    project && (
      <ProjectContext project={project}>
        <Label review={false} />
      </ProjectContext>
    )
  );
}

function InvalidProjectId() {
  const id = new URLSearchParams(window.location.search).get('projectId');

  return (
    <Box
      sx={{
        boxSizing: 'border-box',
        display: 'flex',
        flexGrow: 1,
        flexDirection: 'column',
        p: 2,
        alignItems: 'center',
      }}
    >
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

function DeepCellLabel() {
  const id = new URLSearchParams(window.location.search).get('projectId');

  return (
    <Div
      sx={{
        boxSizing: 'border-box',
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
      }}
    >
      <NavBar />
      <Router>
        <Routes>
          <Route path='/' element={<Load />} />
          <Route
            path='/project'
            element={
              isProjectId(id) ? (
                <LabelProject />
              ) : isReview(id) ? (
                <Review ids={id} />
              ) : (
                <InvalidProjectId />
              )
            }
          />
        </Routes>
      </Router>
      <Footer />
    </Div>
  );
}

function App() {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <DeepCellLabel />
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;
