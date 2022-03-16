import { Box, createTheme, StyledEngineProvider, ThemeProvider, Typography } from '@mui/material';
import { styled } from '@mui/system';
import { useMachine, useSelector } from '@xstate/react';
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { interpret } from 'xstate';
import Footer from './Footer/Footer';
import Label from './Label';
import Load from './Load/Load';
import NavBar from './Navbar';
import ProjectContext from './ProjectContext';
import QualityControlContext from './QualityControlContext';
import createLoadMachine from './service/loadMachine';
import createProjectMachine from './service/projectMachine';
import { isProjectId, qualityControl } from './service/service';

// import service from './service/service';

// inspect({
//   // options
//   // url: 'https://statecharts.io/inspect', // (default)
//   iframe: false // open in new window
// });

const Div = styled('div')``;

const theme = createTheme();

function Review() {
  const project = useSelector(qualityControl, (state) => {
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
  const [loadState] = useMachine(createLoadMachine(projectId));
  const [project] = useState(interpret(createProjectMachine(projectId)).start());

  useEffect(() => {
    if (loadState.matches('loaded')) {
      const { rawArrays, labeledArrays, labels } = loadState.context;
      project.send({
        type: 'LOADED',
        rawArrays,
        labeledArrays,
        labels,
      });
    }
  }, [loadState, project]);

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
              ) : id?.split(',')?.every(isProjectId) ? (
                <Review />
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
