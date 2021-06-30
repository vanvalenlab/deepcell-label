import { interpret } from 'xstate';
import fetchMock from 'jest-fetch-mock';
import createApiMachine from './apiMachine';

fetchMock.enableMocks();

describe('test apiMachine event handling', () => {

  beforeEach(() => {
    fetch.resetMocks();
  });

  const backendEvents = [
    'EDIT',
    'BACKEND_UNDO',
    'BACKEND_REDO',
  ];

  backendEvents.forEach((event) => {
    it(`${event} events call API successfully and return to idle`, (done) => {
      let edited = false;
      let transitioned = false;
      const apiMachine = createApiMachine({
        projectId: 'testProjectId',
        bucket: 'testBucket',
      }).withConfig({
        actions: {
          sendEdited: () => {
            edited = true
          },
        }
      });
      const apiService = interpret(apiMachine).onTransition((state) => {
        // first event causes transition to loading
        if (state.matches('loading')) {
          expect(edited).not.toBeTruthy();
          transitioned = true;
        }
        // after calling sendEdited the state will be idle
        if (state.matches('idle') && transitioned) {
          expect(edited).toBeTruthy();
          done();
        }
      });

      apiService.start();

      // successful API call
      fetch.mockResponseOnce(JSON.stringify({
        data: {
          frames: [],
          labels: [],
        }
      }));
      apiService.send({ type: event, args: [], action: 'test' });
    });

    it(`${event} events call API unsuccessfully and return to idle`, (done) => {
      let failed = false;
      let transitioned = false;
      const apiMachine = createApiMachine({
        projectId: 'testProjectId',
        bucket: 'testBucket',
      }).withConfig({
        actions: {
          sendError: () => {
            failed = true
          },
        }
      });
      const apiService = interpret(apiMachine).onTransition((state) => {
        // first event causes transition to loading
        if (state.matches('loading')) {
          expect(failed).not.toBeTruthy();
          transitioned = true;
        }
        // after calling sendEdited the state will be idle
        if (state.matches('idle') && transitioned) {
          expect(failed).toBeTruthy();
          done();
        }
      });

      apiService.start();

      // unsuccessful API call
      fetch.mockResponseOnce(() => Promise.reject('API is down'));
      apiService.send({ type: event, args: [], action: 'test' });
    });
  });

  it('UPLOAD events call API successfully and return to idle', (done) => {
    let transitioned = false;
    const apiMachine = createApiMachine({
      projectId: 'testProjectId',
      bucket: 'testBucket',
    });
    const apiService = interpret(apiMachine).onTransition((state) => {
      // first event causes transition to uploading.
      if (state.matches('uploading')) {
        transitioned = true;
      }
      // after calling sendEdited the state will be idle
      if (state.matches('idle') && transitioned) {
        done();
      }
    });

    apiService.start();

    // successful API call
    fetch.mockResponseOnce(JSON.stringify({}));
    apiService.send({ type: 'UPLOAD', args: [], action: 'test' });
  });

  it(`UPLOAD events call API unsuccessfully and return to idle`, (done) => {
    let failed = false;
    let transitioned = false;
    const apiMachine = createApiMachine({
      projectId: 'testProjectId',
      bucket: 'testBucket',
    }).withConfig({
      actions: {
        sendError: () => {
          failed = true
        },
      }
    });
    const apiService = interpret(apiMachine).onTransition((state) => {
      // first event causes transition to uploading
      if (state.matches('uploading')) {
        expect(failed).not.toBeTruthy();
        transitioned = true;
      }
      // after calling sendEdited the state will be idle
      if (state.matches('idle') && transitioned) {
        expect(failed).toBeTruthy();
        done();
      }
    });

    apiService.start();

    // unsuccessful API call
    fetch.mockResponseOnce(() => Promise.reject('API is down'));
    apiService.send({ type: 'UPLOAD', args: [], action: 'test' });
  });
});
