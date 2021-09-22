import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Label from './Label';
import Load from './Load';
import ProjectContext from './ProjectContext';
import service from './service/service';

// inspect({
//   // options
//   // url: 'https://statecharts.io/inspect', // (default)
//   iframe: false // open in new window
// });

function App() {
  return (
    <Router>
      <Switch>
        <Route path='/project'>
          <ProjectContext project={service}>
            <Label />
          </ProjectContext>
        </Route>
        <Route path='/'>
          <Load />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
