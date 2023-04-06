// Adapted from https://github.com/tensorflow/models/blob/master/official/nlp/modeling/layers/gaussian_process.py

import * as tf from '@tensorflow/tfjs';
import { DataTypeMap, Shape, Tensor } from '@tensorflow/tfjs';
import { inv } from 'mathjs';
import { Kwargs } from './spectralNormalizationLayer';

export class LaplaceRandomFeatureCovariance extends tf.layers.Layer {
  ridgePenalty: number;
  momentum: number;
  likelihood: string;
  initialPrecisionMatrix: Tensor | undefined = undefined;
  precisionMatrix: tf.LayerVariable | undefined = undefined;

  constructor(
    momentum: number = 0.999,
    ridgePenalty: number = 1,
    likelihood: string = 'gaussian',
    dtype: keyof DataTypeMap | undefined = undefined,
    name: string = 'laplaceCovariance'
  ) {
    super({ dtype: dtype, name: name });
    this.ridgePenalty = ridgePenalty;
    this.momentum = momentum;
    this.likelihood = likelihood;
  }

  computeOutputShape(inputShape: Shape) {
    const gpFeatureDim = inputShape[inputShape.length - 1];
    const outputShape: Shape = [gpFeatureDim, gpFeatureDim];
    return outputShape;
  }

  build(inputShape: Shape | Shape[]) {
    // @ts-ignore
    const gpFeatureDim: number = inputShape[inputShape.length - 1];

    // Posterior precision matrix for the GP's random feature coefficients
    this.initialPrecisionMatrix = tf
      .scalar(this.ridgePenalty)
      .mul(tf.eye(gpFeatureDim, undefined, undefined, this.dtype));

    this.precisionMatrix = this.addWeight(
      'gpPrecisionMatrix',
      [gpFeatureDim, gpFeatureDim],
      this.dtype,
      tf.initializers.identity({ gain: this.ridgePenalty }),
      undefined,
      false
    );
    this.built = true;
  }

  makePrecisionMatrixUpdateOp(gpFeature: Tensor | Tensor[], precisionMatrix: tf.LayerVariable) {
    // Assume gaussian likelihood
    // @ts-ignore
    const precisionMatrixMinibatch = tf.matMul(gpFeature, gpFeature, true);
    // Assume negative momentum -> exact covariance
    const precisionMatrixNew = tf.add(precisionMatrix.read(), precisionMatrixMinibatch);

    return () => precisionMatrix.write(precisionMatrixNew);
  }

  resetPrecisionMatrix() {
    // @ts-ignore
    const precisionMatrixResetOp = () => this.precisionMatrix.write(this.initialPrecisionMatrix);
    precisionMatrixResetOp();
  }

  computePredictiveCovariance(gpFeature: Tensor | Tensor[]) {
    return tf.tidy(() => {
      // Computes the covariance matrix of the feature coefficient
      // @ts-ignore
      const featureCovMatrix = tf.tensor(inv(this.precisionMatrix.read().arraySync()));

      // Computes the covariance matrix of the gp prediction
      const covFeatureProduct = tf.mul(
        // @ts-ignore
        tf.matMul(featureCovMatrix, gpFeature, undefined, true),
        tf.scalar(this.ridgePenalty)
      );
      // @ts-ignore
      const gpCovMatrix = tf.matMul(gpFeature, covFeatureProduct);
      return gpCovMatrix;
    });
  }

  call(inputs: Tensor | Tensor[], kwargs: Kwargs) {
    return tf.tidy(() => {
      const training = kwargs['training'];
      // @ts-ignore
      const batchSize = inputs.shape[0];
      if (training) {
        // Define and register update op for feature precision matrix
        const precisionMatrixUpdateOp = this.makePrecisionMatrixUpdateOp(
          inputs,
          // @ts-ignore
          this.precisionMatrix
        );
        precisionMatrixUpdateOp();
        // Return null estimate during training
        return tf.eye(batchSize, undefined, undefined, this.dtype);
      } else {
        // Return covariance estimate during inference
        return this.computePredictiveCovariance(inputs);
      }
    });
  }

  /**
   * The static className getter is required by the
   * registration step
   */
  static get className() {
    return 'LaplaceRandomFeatureCovariance';
  }
}

tf.serialization.registerClass(LaplaceRandomFeatureCovariance);
