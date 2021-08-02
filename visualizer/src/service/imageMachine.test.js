import { interpret } from 'xstate';
import createImageMachine from './imageMachine';

describe('test imageMachine', () => {
  it('imageMachine.syncToolState should reach idle', (done) => {
    const imageMachine = createImageMachine('testProjectId');
    const imageService = interpret(imageMachine).onTransition((state) => {
      // this is where you expect the state to eventually
      // be reached
      if (state.matches('syncTool.idle')) {
        done();
      }
    });

    imageService.start();

    // send zero or more events to the service that should
    // cause it to eventually reach its expected state
    imageService.send({ type: 'TOOL_REF', toolRef: null });
  });

});
