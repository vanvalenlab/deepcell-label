import { canvasService } from './statechart/service';


const canvasKeydownLookup = {
  ' ': 'keydown.Space',
};

const canvasKeyupLookup = {
  ' ': 'keyup.Space',
};

window.addEventListener('keydown', (e) => handleKeydown(e));
window.addEventListener('keyup', (e) => handleKeyup(e));


function handleKeydown(event) {
  if (canvasKeydownLookup[event.key]) {
    canvasService.send(canvasKeydownLookup[event.key]);
    console.log('space DOWN sent to canvas')
  }
}

function handleKeyup(event) {
  if (canvasKeyupLookup[event.key]) {
    canvasService.send(canvasKeyupLookup[event.key]);
    console.log('space UP sent to canvas')
  }
}