import { interpret } from 'xstate';
import createImageMachine from './imageMachine';

describe('test imageMachine', () => {
  it('imageMachine.loadFrame should reach idle after raw and labeled data load', (done) => {
    const imageMachine = createImageMachine('testProjectId').withConfig({
      actions: {
        spawnActors: () => {},
        addActorsToUndo: () => {},
        loadRaw: () => {},
        loadLabeled: () => {},
        useFrame: () => {},
      },
    });
    const imageService = interpret(imageMachine).onTransition((state) => {
      // this is where you expect the state to eventually
      // be reached
      if (state.matches('loadFrame.idle')) {
        done();
      }
    });

    imageService.start();

    // send zero or more events to the service that should
    // cause it to eventually reach its expected state
    imageService.send({ type: 'PROJECT' });
    imageService.send({ type: 'RAW_LOADED' });
    imageService.send({ type: 'LABELED_LOADED' });
  });
});
