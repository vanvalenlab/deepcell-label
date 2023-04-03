// Util functions, some grabbed from tfjs-core

import { Tensor, TensorBuffer, tidy } from '@tensorflow/tfjs';
import * as tfc from '@tensorflow/tfjs-core';

/**
 * Element-wise square.
 * @param x Input tensor.
 * @return element-wise x^2
 */
export function square(x: Tensor): Tensor {
  return tfc.mul(x, x);
}

let _epsilon: number;

/**
 * Returns the value of the fuzz factor used in numeric expressions.
 */
export function epsilon() {
  if (_epsilon == null) {
    _epsilon = tfc.backend().epsilon();
  }
  return _epsilon;
}

/**
 * Normalizes a tensor wrt the L2 norm alongside the specified axis.
 * @param x
 * @param axis Axis along which to perform normalization.
 */
export function l2Normalize(x: Tensor, axis?: number): Tensor {
  return tidy(() => {
    if (x.dtype !== 'float32') {
      x = x.asType('float32');
    }
    const squareSum = tfc.sum(square(x), axis, true);
    const epsilonTensor = tfc.fill(squareSum.shape, epsilon());
    const norm = tfc.sqrt(tfc.maximum(squareSum, epsilonTensor));
    return tfc.div(x, norm);
  });
}

export function assert(expr: boolean, msg: string | (() => string)) {
  if (!expr) {
    throw new Error(typeof msg === 'string' ? msg : msg());
  }
}

/**
 * Given a Tensor, outputs the diagonal part as a Tensor
 * @param x
 */
export function diagPart(x: Tensor): Tensor {
  const xVals = x.dataSync();
  const buffer = new TensorBuffer([Math.sqrt(x.size)], x.dtype);
  const vals = buffer.values;
  for (let i = 0; i < vals.length; i++) {
    vals[i] = xVals[i * vals.length + i];
  }
  return buffer.toTensor();
}
