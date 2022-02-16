// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true;
  eventsCausingActions: {
    'set labels': 'done.invoke.load.loading.loadLabels.fetching:invocation[0]';
    'set dimensions': 'done.invoke.load.loading.loadArrays.fetching dimensions:invocation[0]';
    'set raw array': 'done.invoke.load.loading.loadArrays.loadArrays.raw.fetching:invocation[0]';
    'set labeled array': 'done.invoke.load.loading.loadArrays.loadArrays.labeled.fetching:invocation[0]';
  };
  internalEvents: {
    'done.invoke.load.loading.loadLabels.fetching:invocation[0]': {
      type: 'done.invoke.load.loading.loadLabels.fetching:invocation[0]';
      data: unknown;
      __tip: 'See the XState TS docs to learn how to strongly type this.';
    };
    'done.invoke.load.loading.loadArrays.fetching dimensions:invocation[0]': {
      type: 'done.invoke.load.loading.loadArrays.fetching dimensions:invocation[0]';
      data: unknown;
      __tip: 'See the XState TS docs to learn how to strongly type this.';
    };
    'done.invoke.load.loading.loadArrays.loadArrays.raw.fetching:invocation[0]': {
      type: 'done.invoke.load.loading.loadArrays.loadArrays.raw.fetching:invocation[0]';
      data: unknown;
      __tip: 'See the XState TS docs to learn how to strongly type this.';
    };
    'done.invoke.load.loading.loadArrays.loadArrays.labeled.fetching:invocation[0]': {
      type: 'done.invoke.load.loading.loadArrays.loadArrays.labeled.fetching:invocation[0]';
      data: unknown;
      __tip: 'See the XState TS docs to learn how to strongly type this.';
    };
    'xstate.init': { type: 'xstate.init' };
  };
  invokeSrcNameMap: {
    'fetch labels': 'done.invoke.load.loading.loadLabels.fetching:invocation[0]';
    'fetch dimensions': 'done.invoke.load.loading.loadArrays.fetching dimensions:invocation[0]';
    'fetch raw array': 'done.invoke.load.loading.loadArrays.loadArrays.raw.fetching:invocation[0]';
    'fetch labeled array': 'done.invoke.load.loading.loadArrays.loadArrays.labeled.fetching:invocation[0]';
  };
  missingImplementations: {
    actions: never;
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingServices: {
    'fetch labels': 'xstate.init';
    'fetch dimensions': 'xstate.init';
    'fetch raw array': 'xstate.init';
    'fetch labeled array': 'xstate.init';
  };
  eventsCausingGuards: {};
  eventsCausingDelays: {};
  matchesStates:
    | 'loading'
    | 'loading.loadLabels'
    | 'loading.loadLabels.fetching'
    | 'loading.loadLabels.loaded'
    | 'loading.loadArrays'
    | 'loading.loadArrays.fetching dimensions'
    | 'loading.loadArrays.loadArrays'
    | 'loading.loadArrays.loadArrays.raw'
    | 'loading.loadArrays.loadArrays.raw.fetching'
    | 'loading.loadArrays.loadArrays.raw.loaded'
    | 'loading.loadArrays.loadArrays.labeled'
    | 'loading.loadArrays.loadArrays.labeled.fetching'
    | 'loading.loadArrays.loadArrays.labeled.loaded'
    | 'loading.loadArrays.loaded'
    | 'loaded'
    | {
        loading?:
          | 'loadLabels'
          | 'loadArrays'
          | {
              loadLabels?: 'fetching' | 'loaded';
              loadArrays?:
                | 'fetching dimensions'
                | 'loadArrays'
                | 'loaded'
                | {
                    loadArrays?:
                      | 'raw'
                      | 'labeled'
                      | {
                          raw?: 'fetching' | 'loaded';
                          labeled?: 'fetching' | 'loaded';
                        };
                  };
            };
      };
  tags: never;
}
