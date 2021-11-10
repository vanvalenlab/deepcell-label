import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Label from './Label';
import Load from './Load/Load';
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
      <Routes>
        <Route path='/' element={<Load />} />
        <Route
          path='/project'
          element={
            <ProjectContext project={service}>
              <Label />
            </ProjectContext>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
