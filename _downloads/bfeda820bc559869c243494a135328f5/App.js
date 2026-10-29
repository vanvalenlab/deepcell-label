import { createTheme, CssBaseline, StyledEngineProvider, ThemeProvider } from '@mui/material';
import { styled } from '@mui/system';
import { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Footer from './Footer';
import Load from './Load';
import Loading from './Loading';
import NavBar from './Navbar';
import Label from './Project';

const Div = styled('div')``;

function App() {
  const [theme, setTheme] = useState(createTheme({ palette: { mode: 'light' } }));
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Div
          sx={{
            boxSizing: 'border-box',
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
          }}
        >
          <NavBar theme={theme.palette.mode} setTheme={setTheme} />
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
