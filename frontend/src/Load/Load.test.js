import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Load from './Load';

describe('landing page tests', () => {
  it('should render with a disabled button', () => {
    const { container } = render(<Load />);
    const element = container.querySelector('#submitExample');
    expect(element).toBeDisabled();
  });

  it('should render a file input dropzone', () => {
    render(<Load />);
    const element = screen.getByTestId('image-input');
    expect(element).toBeInTheDocument();
  });
});
