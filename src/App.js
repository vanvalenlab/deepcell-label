import logo from './logo.svg';
import './App.css';
import ControlPanel from './ControlPanel';
import Navbar from './Navbar';
import Canvas from './Canvas';
import InstructionPane from './InstructionPane';
// import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';

function App() {
  return (
    <div className="App">
      <Navbar />
      <InstructionPane />
      <Grid container spacing={1}>
        <Grid item xs={3}>
          <ControlPanel />
        </Grid>
        <Grid item xs id='canvas-grid-item'>
          <Canvas />
        </Grid>
      </Grid>
      {/* <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header> */}
      <footer className="page-footer white">
        <div className="footer-copyright white">
          <div className="container center-align grey-text darken-5-text">
          © 2016-2021 The Van Valen Lab at the California Institute of Technology (Caltech). All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
