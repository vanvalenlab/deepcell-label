import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Label from './Label';
import ProjectContext from './ProjectContext';
import QualityControl from './QualityControl';
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
        <Route path='/review'>
          <QualityControl />
        </Route>
        <Route path='/'>
          <ProjectContext>
            <Label project={service} />
          </ProjectContext>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
