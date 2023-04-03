// Adapted from https://github.com/tensorflow/models/blob/master/official/nlp/modeling/layers/spectral_normalization.py

import * as tf from '@tensorflow/tfjs';
import { DataType, LayerVariable, Shape, Tensor } from '@tensorflow/tfjs';
import { RegularizerFn } from '@tensorflow/tfjs-layers/dist/types';
// import { Wrapper } from '@tensorflow/tfjs-layers/dist/layers/wrappers';
import { l2Normalize } from './tfcUtils';

export type Kwargs = {
  [key: string]: any;
};

export class SpectralNormalization extends tf.layers.Layer {
  layer: tf.layers.Layer;
  iteration: number;
  normMultiplier: number;
  doPowerIteration: boolean;
  w: tf.LayerVariable | undefined = undefined;
  _dtype: DataType | undefined = undefined;
  u: tf.LayerVariable | undefined = undefined;
  v: tf.LayerVariable | undefined = undefined;
  wShape: Array<null | number> | undefined = undefined;

  constructor(
    layer: tf.layers.Layer,
    iteration: number = 1,
    normMultiplier: number = 0.9,
    training: boolean = true,
    config?: any
  ) {
    // super({ layer: layer, ...config });
    super(config || {});
    this.layer = layer;
    this.iteration = iteration;
    this.normMultiplier = normMultiplier;
    this.doPowerIteration = training;
  }

  build(inputShape: Shape | Shape[]) {
    if (!this.layer.built) {
      this.layer.build(inputShape);
      this.layer.built = true;
    }
    // super.build(inputShape);
    this.built = true;
    // @ts-ignore
    this.w = this.layer.kernel;
    // @ts-ignore
    this._dtype = this.layer.kernel.dtype;
    // @ts-ignore
    this.wShape = this.w.shape;

    // @ts-ignore
    const vShape = [1, this.wShape.slice(0, -1).reduce((a, b) => a * b, 1)];
    const wShape = [1, this.wShape[this.wShape.length - 1]];
    const initializer = tf.initializers.randomNormal({});
    const trainable = false;

    // @ts-ignore
    this.v = this.addWeight('v', vShape, this.dtype, initializer, undefined, trainable);
    // @ts-ignore
    this.u = this.addWeight('u', wShape, this.dtype, initializer, undefined, trainable);

    this.updateWeights({});
  }

  call(inputs: Tensor | Tensor[], kwargs: Kwargs) {
    const training = kwargs['training'];
    // const isTraining = training ? training : this.doPowerIteration;
    let output;
    if (training) {
      const { uUpdateOp, vUpdateOp, wUpdateOp } = this.updateWeights({ training });
      output = this.layer.call(inputs, {});
      const wRestoreOp = () => this.restoreWeights();

      // Register update ops
      uUpdateOp();
      vUpdateOp();
      wUpdateOp();
      wRestoreOp();
    } else {
      output = this.layer.call(inputs, {});
    }

    return output;
  }

  updateWeights({ training = true }) {
    // @ts-ignore
    let wReshaped = tf.reshape(this.w.read(), [-1, this.wShape[this.wShape.length - 1]]);
    let uHat = this.u;
    let vHat = this.v;

    if (training) {
      for (let i = 0; i < this.iteration; i++) {
        // @ts-ignore
        vHat.write(l2Normalize(tf.matMul(uHat.read(), tf.transpose(wReshaped))));
        // @ts-ignore
        uHat.write(l2Normalize(tf.matMul(vHat.read(), wReshaped)));
      }
    }

    // @ts-ignore
    const sigma = tf.reshape(
      // @ts-ignore
      tf.matMul(tf.matMul(vHat.read(), wReshaped), tf.transpose(uHat.read())),
      []
    );
    // @ts-ignore
    const bound = this.normMultiplier / sigma.arraySync();
    // @ts-ignore
    const uUpdateOp = () => this.u.write(uHat.read());
    // @ts-ignore
    const vUpdateOp = () => this.v.write(vHat.read());

    // Bound spectral norm to be not larger than this.normMultiplier
    // @ts-ignore
    const wNorm = bound < 1 ? this.w.read().mul(bound) : this.w.read();
    //@ts-ignore
    const wUpdateOp = () => this.layer.kernel.write(wNorm);
    return { uUpdateOp, vUpdateOp, wUpdateOp };
  }

  restoreWeights() {
    //@ts-ignore
    return this.layer.kernel.write(this.w.read());
  }

  computeOutputShape(inputShape: Shape) {
    return this.layer.computeOutputShape(inputShape);
  }

  override get trainable(): boolean {
    // Porting Note: the check of `this.layer` here is necessary due to the
    //   way the `constructor` of this class is written (see Porting Note
    //   above).
    if (this.layer != null) {
      return this.layer.trainable;
    } else {
      return false;
    }
  }

  override set trainable(value: boolean) {
    // Porting Note: the check of `this.layer` here is necessary due to the
    //   way the `constructor` of this class is written (see Porting Note
    //   above).
    if (this.layer != null) {
      this.layer.trainable = value;
    }
  }

  get trainableWeights(): LayerVariable[] {
    const layerTrainableWeights = this.layer.trainableWeights;
    // @ts-ignore
    const trainableWeights = super.trainableWeights;
    return layerTrainableWeights.concat(trainableWeights);
  }
  // TODO(cais): Implement setter for trainableWeights.

  get nonTrainableWeights(): LayerVariable[] {
    // @ts-ignore
    return this.layer.nonTrainableWeights.concat(super.nonTrainableWeights);
  }
  // TODO(cais): Implement setter for nonTrainableWeights.

  override get updates(): Tensor[] {
    // tslint:disable-next-line:no-any
    return (this.layer as any)._updates;
  }

  // TODO(cais): Implement getUpdatesFor().

  override get losses(): RegularizerFn[] {
    return this.layer.losses;
  }

  // TODO(cais): Implement getLossesFor().

  override getWeights(): Tensor[] {
    return this.layer.getWeights();
  }

  override setWeights(weights: Tensor[]): void {
    this.layer.setWeights(weights);
  }

  /**
   * The static className getter is required by the
   * registration step
   */
  static get className() {
    return 'SpectralNormalization';
  }
}

tf.serialization.registerClass(SpectralNormalization);
