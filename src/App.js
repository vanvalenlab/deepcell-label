import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import ServiceContext from './ServiceContext';
import Label from './Label';


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
