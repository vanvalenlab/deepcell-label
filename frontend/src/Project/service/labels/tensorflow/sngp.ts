import * as tf from '@tensorflow/tfjs';
import { LayersModel, Tensor, tidy } from '@tensorflow/tfjs';
import { FeedDict } from '@tensorflow/tfjs-layers/dist/engine/executor';
import { toList } from '@tensorflow/tfjs-layers/dist/utils/generic_utils';
import { execute } from './execute';
import { Kwargs } from './spectralNormalizationLayer';

export class SNGP extends LayersModel {
  constructor(inputs: tf.SymbolicTensor, outputs: tf.SymbolicTensor) {
    super({ inputs: inputs, outputs: outputs });
  }

  call(inputs: Tensor | Tensor[], kwargs: Kwargs): Tensor | Tensor[] {
    return tidy(() => {
      inputs = toList(inputs);
      const feedDict = new FeedDict();
      for (let i = 0; i < this.inputs.length; ++i) {
        feedDict.add(this.inputs[i], inputs[i]);
      }
      return execute(this.outputs, feedDict, kwargs) as Tensor | Tensor[];
    });
  }
}
