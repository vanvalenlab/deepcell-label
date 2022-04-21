import { createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material';
import { styled } from '@mui/system';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Footer from './Footer';
import Load from './Load';
import NavBar from './Navbar';
import Project from './Project';

process.title = 'dcl-frontend';

// inspect({
//   // options
//   // url: 'https://statecharts.io/inspect', // (default)
//   iframe: false // open in new window
// });

const Div = styled('div')``;
const theme = createTheme();

function App() {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <Div
          sx={{
            boxSizing: 'border-box',
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
          }}
        >
          <NavBar />
          <Router>
            <Routes>
              <Route path='/' element={<Load />} />
              <Route path='/project' element={<Project />} />
            </Routes>
          </Router>
          <Footer />
        </Div>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;
