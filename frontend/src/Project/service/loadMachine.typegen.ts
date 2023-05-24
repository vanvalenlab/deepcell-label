// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true;
  internalEvents: {
    'done.invoke.load.loading:invocation[0]': {
      type: 'done.invoke.load.loading:invocation[0]';
      data: unknown;
      __tip: 'See the XState TS docs to learn how to strongly type this.';
    };
    'done.invoke.load.splitArrays:invocation[0]': {
      type: 'done.invoke.load.splitArrays:invocation[0]';
      data: unknown;
      __tip: 'See the XState TS docs to learn how to strongly type this.';
    };
    'error.platform.load.loading:invocation[0]': {
      type: 'error.platform.load.loading:invocation[0]';
      data: unknown;
    };
    'xstate.init': { type: 'xstate.init' };
  };
  invokeSrcNameMap: {
    'fetch project zip': 'done.invoke.load.loading:invocation[0]';
    'split arrays': 'done.invoke.load.splitArrays:invocation[0]';
  };
  missingImplementations: {
    actions: never;
    delays: never;
    guards: never;
    services: never;
  };
  eventsCausingActions: {
    'send loaded': 'done.invoke.load.splitArrays:invocation[0]';
    'send project not in output bucket': 'error.platform.load.loading:invocation[0]';
    'set arrays': 'done.invoke.load.splitArrays:invocation[0]';
    'set cellTypes': 'done.invoke.load.loading:invocation[0]';
    'set cells': 'done.invoke.load.loading:invocation[0]';
    'set divisions': 'done.invoke.load.loading:invocation[0]';
    'set embeddings': 'done.invoke.load.loading:invocation[0]';
    'set metadata': 'done.invoke.load.loading:invocation[0]';
    'set spots': 'done.invoke.load.loading:invocation[0]';
  };
  eventsCausingDelays: {};
  eventsCausingGuards: {};
  eventsCausingServices: {
    'fetch project zip': 'xstate.init';
    'split arrays': 'done.invoke.load.loading:invocation[0]';
  };
  matchesStates: 'loaded' | 'loading' | 'splitArrays';
  tags: never;
}
