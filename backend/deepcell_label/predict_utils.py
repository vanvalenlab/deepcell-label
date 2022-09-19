from deepcell.model_zoo.panopticnet import PanopticNet
import matplotlib.pyplot as plt
import numpy as np
from timeit import default_timer
from skimage.transform import resize
import tensorflow as tf

INPUT_SHAPE = (64, 64, 1)
RESIZED_SHAPE = (64, 64)
MODEL_PATH = 'deepcell_label/phase_deep_fgbg_v3.h5'

class Predictor:
    """"""

    def __init__(self):
        start = default_timer()
        prediction_model = PanopticNet(
            backbone='resnet50',
            include_top=True,
            norm_method='whole_image',
            num_semantic_classes=[2], # fgbg
            input_shape=INPUT_SHAPE
        )
        prediction_model.load_weights(MODEL_PATH)
        self.model = prediction_model
        print(f"Model loaded in {default_timer() - start} seconds...")

    def predict_entire(self, raw_image):
        raw_image = np.reshape(raw_image, (1,) + raw_image.shape)
        prediction = self.model.predict(raw_image)
        return np.around(prediction[0,...,1])

    def predict(self, raw_image, bounds):
        resized = self.resize(raw_image, bounds)
        resized = np.reshape(resized, (1,) + resized.shape)

        start = default_timer()
        prediction = self.model.predict(resized)[0,...,1]
        predict_time = default_timer() - start
        print(f"Prediction made in {predict_time} seconds...")

        miny, minx, maxy, maxx = bounds
        new_size = (maxy - miny, maxx - minx)
        resized_pred = resize(prediction, new_size, anti_aliasing=True)
        return np.around(resized_pred)

    def prediction_to_mask(self, img_shape, prediction, bounds):
        miny, minx, maxy, maxx = bounds
        mask = np.zeros(img_shape)
        mask[miny:maxy, minx:maxx] = prediction
        return mask.astype('bool')

    def resize(self, raw_image, bounds):
        miny, minx, maxy, maxx = bounds
        resized = resize(raw_image[miny:maxy, minx:maxx], RESIZED_SHAPE, anti_aliasing=True)
        return np.reshape(resized, INPUT_SHAPE)

    def visualize(self, raw_image, prediction, mask):
        fig, axes = plt.subplots(1, 3, figsize=(12, 8))

        axes[0].imshow(raw_image, cmap='gray')
        axes[0].set_title('Raw')
        axes[1].imshow(prediction)
        axes[1].set_title('Prediction')
        axes[2].imshow(raw_image, cmap='gray')
        axes[2].imshow(mask, alpha=0.5)
        axes[2].set_title('Overlaid Prediction')

        plt.show()

    def get_mask(self, raw_image, labels, bounds):
        prediction = self.predict(raw_image, bounds)
        shape = labels.shape
        return self.prediction_to_mask(shape, prediction, bounds)

if __name__ == '__main__':
    model = Predictor()

    test_set = np.load('./small_test_set.npy')
    raw_image = np.reshape(test_set[15], RESIZED_SHAPE)
    bounds = (0, 0, 128, 128)

    prediction = model.predict(raw_image, bounds)
    model.visualize(raw_image, prediction, model.get_mask(raw_image, bounds))