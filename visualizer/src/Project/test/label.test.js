import { render, screen } from '@testing-library/react'; // testing helpers
import userEvent from '@testing-library/user-event'; // testing helpers for imitating user events
import 'fake-indexeddb/auto';
import React from 'react'; // so that we can use JSX syntax
import { interpret } from 'xstate';
import Project from '../Project';
import ProjectContext from '../ProjectContext';
import createProjectMachine from '../service/projectMachine';
import * as testData from './testData';

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

function setup(projectData) {
  const project = interpret(createProjectMachine('testProject')).start();
  project.send({ type: 'LOADED', ...projectData });

  const utils = render(
    <ProjectContext project={project}>
      <Project />
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
