import Label from './Label';
import ServiceContext from './ServiceContext';

// inspect({
//   // options
//   // url: 'https://statecharts.io/inspect', // (default)
//   iframe: false // open in new window
// });

function App() {
  return (
    <ServiceContext>
      <Label />
    </ServiceContext>
  );
}

export default App;
