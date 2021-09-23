import { useSelector } from '@xstate/react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Label from './Label';
import ProjectContext from './ProjectContext';
import QualityControlContext from './QualityControlContext';
import { project, qualityControl } from './service/service';
// import service from './service/service';

// inspect({
//   // options
//   // url: 'https://statecharts.io/inspect', // (default)
//   iframe: false // open in new window
// });

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

function App() {
  const review = !!new URLSearchParams(window.location.search).get('projectIds');

  return (
    <Router>
      <Switch>
        <Route path='/'>
          {review ? <Review /> : <LabelProject />}
          {/* <ProjectContext project={service}>
            <Label />
          </ProjectContext> */}
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
