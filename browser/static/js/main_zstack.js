var controller;
var model;
var view;
// var service;

function startDeepCellLabel(settings) {
  controller = new Controller(settings.token);

  // // Interpret the machine, and add a listener for whenever a transition occurs.
  // service = interpret(deepcellLabelMachine).onTransition(state => {
  //   console.log(state.value);
  //   console.log(service.state.value);
  // });
  // // Start the service
  // service.start();
}
