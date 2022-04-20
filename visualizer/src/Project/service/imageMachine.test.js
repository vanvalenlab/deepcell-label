import { interpret } from 'xstate';
import { EventBus } from './eventBus';
import createImageMachine from './imageMachine';

const eventBuses = {
  image: new EventBus(),
  undo: new EventBus(),
  load: new EventBus(),
};

describe('test imageMachine', () => {
  it('imageMachine should reach idle after setting up children', (done) => {
    const imageMachine = createImageMachine({
      projectId: 'testProjectId',
      eventBuses,
    }).withConfig({
      actions: {
        spawnActors: () => {},
        addActorsToUndo: () => {},
      },
    });
    const imageService = interpret(imageMachine).onTransition((state) => {
      // this is where you expect the state to eventually
      // be reached
      if (state.matches('idle')) {
        done();
      }
    });

    imageService.start();
  });
});
