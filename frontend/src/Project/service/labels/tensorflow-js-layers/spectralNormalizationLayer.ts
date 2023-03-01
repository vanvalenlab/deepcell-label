import * as tf from '@tensorflow/tfjs';
import { Shape } from '@tensorflow/tfjs';

class SpectralNormalization extends tf.layers.Layer {
  powerIterations: number;
  initialized: boolean;

  constructor(layer: tf.layers.Layer, powerIterations: number = 1, config?: any) {
    super(layer, config || {});
    if (powerIterations <= 0) {
      console.error(
        `powerIterations should be greater than zero, got powerIterations=${powerIterations}`
      );
    }
    this.powerIterations = powerIterations;
    this.initialized = false;
  }

  build(inputShape: Shape | Shape[]) {
    super.build(inputShape);
    this.inputSpec = new tf.InputSpec();

    if (this.layer.hasOwnProperty('kernel')) {
      this.w = this.layer.kernel;
    } else if (this.layer.hasOwnProperty('embeddings')) {
      this.w = this.layer.embeddings;
    } else {
      console.error(`${this.layer} object has no attribute 'kernerk' nor 'embeddings'`);
      x;
    }
  }
}
