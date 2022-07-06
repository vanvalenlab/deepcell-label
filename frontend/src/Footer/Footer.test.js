import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';
import Footer from './Footer';

describe('<Footer/> component tests', () => {
  it('<Footer/> renders with copyright info', () => {
    const { getByText } = render(<Footer />);
    const element = getByText(/©/i);
    expect(element).toBeInTheDocument();
  });
});
