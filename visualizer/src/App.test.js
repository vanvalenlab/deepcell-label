import { render, screen } from '@testing-library/react';
import App from './App';
jest.useFakeTimers();

jest.mock('@zip.js/zip.js', () => ({
  __esModule: true,
  default: 'mockedDefaultExport',
  namedExport: jest.fn(),
}));

jest.mock('@hms-dbmi/viv', () => ({
  __esModule: true,
  default: 'mockedDefaultExport',
  namedExport: jest.fn(),
}));

test('renders DeepCell Label', () => {
  render(<App />);
  const linkElements = screen.getAllByText(/DeepCell Label/i);
  linkElements.map((el) => expect(el).toBeInTheDocument());
});
