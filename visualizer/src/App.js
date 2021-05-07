import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import ServiceContext from './ServiceContext';
import Label from './Label';
import { inspect } from '@xstate/inspect';


// inspect({
//   // options
//   // url: 'https://statecharts.io/inspect', // (default)
//   iframe: false // open in new window
// });

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <ServiceContext>
            <Label />
          </ServiceContext>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
