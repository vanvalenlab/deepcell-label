import { render, screen } from '@testing-library/react'; // testing helpers
import userEvent from '@testing-library/user-event'; // testing helpers for imitating user events
import React from 'react'; // so that we can use JSX syntax
import { interpret } from 'xstate';
import Label from '../Label';
import ProjectContext from '../ProjectContext';
import createProjectMachine from '../service/projectMachine';
import * as testData from './testData';

// snippet for mocking offsetHeight & offsetWidth when using jest & JSDOM
// from https://github.com/testing-library/react-testing-library/issues/353#issuecomment-510046921

// const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
// const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');

// beforeAll(() => {
//   Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 500 });
//   Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 500 });
// });

// afterAll(() => {
//   Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
//   Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
// });

// describe('You can test with mocked values here', () => {
//   //offsetHeight = 500
//   //offsetWidth = 500
// });

function setup(projectData) {
  const project = interpret(createProjectMachine('testProject')).start();
  project.send({ type: 'LOADED', ...projectData });

  const utils = render(
    <ProjectContext project={project}>
      <Label />
    </ProjectContext>
  );

  const user = userEvent.setup();

  return {
    ...utils,
    user,
  };
}

test('displays canvas', () => {
  setup(testData.EMPTY);
  const canvas = screen.getByTestId('canvas');
  expect(canvas).toBeInTheDocument();
});

test('project with 2 channels shows both channels', () => {});

describe('label outlines', () => {
  it('starts with outlining enabled', () => {});
  it('does not show outlines for blank labels', () => {});
  it('shows a 1x1 outline for a 1x1 label', () => {});
  it('does not outline the background', () => {});
  it('does not outline the center pixel of a 3x3 label', () => {});

  describe('disabled outlines', () => {
    it('shows the outline for the foreground label in white', () => {});
    it('shows the outline for the background label in red', () => {});
    it('does not show outlines for unselected labels', () => {});
  });

  describe('keybinds', () => {
    it('disables outlines after pressing O', () => {
      // toggle is off
      // canvas does not have outlines
    });
    it('enables outlines after pressing O twice', () => {
      // toggle is on
      // canvas has outlines
    });
  });
});
