import Label from './Label';
import ProjectContext from './ProjectContext';
import service from './service/service';

// inspect({
//   // options
//   // url: 'https://statecharts.io/inspect', // (default)
//   iframe: false // open in new window
// });

function App() {
  return (
    <ProjectContext project={service}>
      <Label />
    </ProjectContext>
  );
}

export default App;
