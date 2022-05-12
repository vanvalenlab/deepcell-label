import fetchMock from 'jest-fetch-mock';
import { interpret } from 'xstate';
import createApiMachine from './apiMachine';
import { EventBus } from './eventBus';

fetchMock.enableMocks();

const eventBuses = {
  api: new EventBus(),
  arrays: new EventBus(),
  image: new EventBus(),
  labeled: new EventBus(),
};

describe('test apiMachine event handling', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  it('LABELED event -> idle state', (done) => {
    const apiMachine = createApiMachine({
      projectId: 'testProjectId',
      bucket: 'testBucket',
      eventBuses,
    });

    const apiService = interpret(apiMachine).onTransition((state) => {
      if (state.matches('idle')) {
        done();
      }
    });

    apiService.start();
    apiService.send({ type: 'LABELED', labeled: [new Int32Array([])] });
  });

  it('EDIT event -> call API successfully -> "idle" state', (done) => {
    let edited = false;
    let transitioned = false;
    const apiMachine = createApiMachine({
      projectId: 'testProjectId',
      bucket: 'testBucket',
      eventBuses,
    }).withConfig({
      actions: {
        sendEdited: () => {
          edited = true;
        },
      },
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
    fetch.mockResponseOnce(
      JSON.stringify({
        data: {
          frames: [],
          labels: [],
        },
      })
    );
    apiService.send({ type: 'LABELED', labeled: [new Int32Array([])] });
    apiService.send({ type: 'EDIT', args: [], action: 'test' });
  });

  it('EDIT event -> call API unsuccessfully -> "idle" state', (done) => {
    let failed = false;
    let transitioned = false;
    const apiMachine = createApiMachine({
      projectId: 'testProjectId',
      bucket: 'testBucket',
      eventBuses,
    });
    const apiService = interpret(apiMachine).onTransition((state) => {
      // first event causes transition to loading
      if (state.matches('loading')) {
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
    fetch.mockResponseOnce(() => {
      failed = true;
      return Promise.reject('API is down');
    });
    apiService.send({ type: 'LABELED', labeled: [new Int32Array([])] });
    apiService.send({ type: 'EDIT', args: [], action: 'test' });
  });

  it('UPLOAD event -> call API successfully -> "idle" state', (done) => {
    let transitioned = false;
    const apiMachine = createApiMachine({
      projectId: 'testProjectId',
      bucket: 'testBucket',
      eventBuses,
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
    apiService.send({ type: 'LABELED', labeled: [new Int32Array([])] });
    apiService.send({ type: 'UPLOAD' });
    expect(fetch).toHaveBeenCalled();
  });

  it(`UPLOAD event -> call API unsuccessfully -> "idle" state`, (done) => {
    let failed = false;
    let transitioned = false;
    const apiMachine = createApiMachine({
      projectId: 'testProjectId',
      bucket: 'testBucket',
      eventBuses,
    });
    const apiService = interpret(apiMachine).onTransition((state) => {
      // first event causes transition to uploading
      if (state.matches('uploading')) {
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
    fetch.mockResponseOnce(() => {
      failed = true;
      return Promise.reject('API is down');
    });
    apiService.send({ type: 'LABELED', labeled: [new Int32Array([])] });
    apiService.send({ type: 'UPLOAD' });
    expect(fetch).toHaveBeenCalled();
  });
});
