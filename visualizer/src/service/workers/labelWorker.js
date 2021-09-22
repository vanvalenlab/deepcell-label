import { createMachine,sendParent } from 'xstate';
import { respond } from 'xstate/lib/actions';
import { assign } from 'xstate/lib/actionTypes';
import { interpretInWebWorker } from '../from-web-worker';


export function createSegmentationImageData(typedArray, colormap, width, height) {
  const data = new Uint8ClampedArray(typedArray.length * 4);
  for (let i = 0; i < typedArray.length; i++) {
    const label = typedArray[i];
    const color = colormap[label];
    data[4 * i] = color[0];
    data[4 * i + 1] = color[1];
    data[4 * i + 2] = color[2];
    data[4 * i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

/**
 * Highlights a label with color.
 * @param {ImageData} imageData where we draw the highlight
 * @param {Array} labeledArray describes label at each pixel; has negative label values on label border
 * @param {int} label label to highlight
 * @param {Array} color color to highlight label with
 */
export function highlightImageData(imageData, labeledArray, label, color) {
  if (label === 0) {
    return;
  }
  const [r, g, b, a] = color;
  const { data, width, height } = imageData;
  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      const element = Math.abs(labeledArray[j][i]);
      if (element === label) {
        data[(j * width + i) * 4 + 0] = r;
        data[(j * width + i) * 4 + 1] = g;
        data[(j * width + i) * 4 + 2] = b;
        data[(j * width + i) * 4 + 3] = a;
      }
    }
  }
}

/**
 * Changes the opacity of the image.
 * @param {ImageData} imageData
 * @param {float} opacity between 0 and 1; 0 makes the image transparent, and 1 does nothing
 */
export function opacityImageData(imageData, opacity) {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] *= opacity;
  }
}
const labelImageWorkerMachine = createMachine(
  {
    id: 'labelImageWorker',
    entry: () => console.log('label image worker started'),
    on: {
      MAKE_LABEL_IMAGE: { },
    }
  },
  {
    actions: {
      makeImage: respond((_, { array }) => {
        type: 'IMAGE',
        image: 
      }),
      // edit:
      sendEdited: sendParent((_, e) => ({
        type: 'EDITED',
        buffer: e?.buffer,
        _transfer: [e?.buffer],
      })),
    },
  }
);

const service = interpretInWebWorker(labelImageWorkerMachine);
service.start();
