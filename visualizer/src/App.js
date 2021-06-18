import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Label from './Label';
import ServiceContext from './ServiceContext';

// inspect({
//   // options
//   // url: 'https://statecharts.io/inspect', // (default)
//   iframe: false // open in new window
// });

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path='/'>
          <ServiceContext>
            <Label />
          </ServiceContext>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
