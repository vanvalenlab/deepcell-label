import { createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material';
import { styled } from '@mui/system';
import { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Footer from './Footer';
import Load from './Load';
import Loading from './Loading';
import NavBar from './Navbar';
import Label from './Project';

const Div = styled('div')``;
const theme = createTheme();

function App() {
  useEffect(() => {
    console.log(`Frontend git branch: ${process.env.REACT_APP_BRANCH}`);
    console.log(`Frontend git commit: ${process.env.REACT_APP_COMMIT}`);
    const version = fetch('/api/version');
    version
      .then((res) => res.json())
      .then((res) => {
        console.log(`Backend git branch: ${res.git_branch}`);
        console.log(`Backend git commit: ${res.git_commit}`);
      });
  }, []);

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
              <Route path='/loading' element={<Loading />} />
              <Route path='/project' element={<Label />} />
            </Routes>
          </Router>
          <Footer />
        </Div>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;
