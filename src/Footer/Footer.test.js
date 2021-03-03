import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Footer from './Footer';

describe('<Footer/> component tests', () => {
  it('<Footer/> renders with copyright info', () => {
    const { getByText } = render(<Footer/>);
    const element = getByText(/©/i);
    expect(element).toBeInTheDocument();
  });
});