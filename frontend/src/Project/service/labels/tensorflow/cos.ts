// Adapted from https://github.com/tensorflow/tfjs/blob/master/tfjs-layers/src/activations.ts

import * as tfc from '@tensorflow/tfjs-core';
import { serialization, Tensor, tidy } from '@tensorflow/tfjs-core';

/*
 *  Base class for Activations
 */
export abstract class Activation extends serialization.Serializable {
  abstract apply(tensor: Tensor, axis?: number): Tensor;
  getConfig(): serialization.ConfigDict {
    return {};
  }
}

export function cos(x: Tensor): Tensor {
  return tidy(() => {
    return tfc.cos(x);
  });
}

export class Cos extends Activation {
  /*** @nocollapse */
  static readonly className = 'cos';
  apply(x: Tensor): Tensor {
    return cos(x);
  }
}
