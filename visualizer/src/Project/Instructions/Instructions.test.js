import '@testing-library/jest-dom';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import Instructions from './Instructions';

// mock instructions tabs with controls
// to avoid using any xstate hooks
jest.mock('./DisplayInstructions', () => {
  return {
    __esModule: true,
    default: () => {
      return <div></div>;
    },
  };
});
jest.mock('./SelectInstructions', () => {
  return {
    __esModule: true,
    default: () => {
      return <div></div>;
    },
  };
});

describe('<Instructions/> component tests', () => {
  it('<Instructions/> expands on click', () => {
    const { getByRole } = render(<Instructions />);
    // open the instructions bar
    const instructionsBar = getByRole('button', { expanded: false });
    expect(instructionsBar).toBeInTheDocument();
    fireEvent.click(instructionsBar);
    expect(instructionsBar).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(instructionsBar);
    expect(instructionsBar).toHaveAttribute('aria-expanded', 'false');
  });

  it('<Instructions/> has clickable tabs', () => {
    const { getByRole, getAllByRole } = render(<Instructions />);
    // open the instructions bar
    const instructionsBar = getByRole('button', { expanded: false });
    fireEvent.click(instructionsBar);

    // tabs are the buttons to show a tab panel
    const tabs = getAllByRole('tab');

    for (let i = 0; i < tabs.length; ++i) {
      const tab = tabs[i];

      // clicking the tab shows the corresponding tab panel
      fireEvent.click(tab);
      expect(tab).toHaveAttribute('aria-selected', 'true');
      const tabPanel = getByRole('tabpanel');
      expect(tabPanel).toBeInTheDocument();
      expect(tabPanel).not.toHaveAttribute('hidden');
    }
  });
});
