import Label from './Label';
import ProjectContext from './ProjectContext';

// inspect({
//   // options
//   // url: 'https://statecharts.io/inspect', // (default)
//   iframe: false // open in new window
// });

function App() {
  return (
    <ProjectContext>
      <Label />
    </ProjectContext>
  );
}

export default App;
