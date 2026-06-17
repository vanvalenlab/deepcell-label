"""Utility functions for DeepCell Label"""

import numpy as np
from segment_anything import sam_model_registry, SamPredictor
from segment_anything.modeling.sam import Sam
from segment_anything.utils.onnx import SamOnnxModel
from pathlib import Path
import os
import torch

from onnxruntime.quantization import QuantType
from onnxruntime.quantization.quantize import quantize_dynamic
from typing import Tuple
import onnxruntime

import cv2

from copy import deepcopy

from deepcell_label.types import BBox


def convert_lineage(lineage):
    """
    Converts a lineage from .trk files into a list of divisions.

    Args:
        lineage (dict): dict that maps cells to lineage info
            e.g. {
                '1': {'frame_div': 1, 'parent': None, 'daughters': [2, 3]},
                '2': {'frame_div': None, 'parent': 1, 'daughters': []},
                '3': {'frame_div': None, 'parent': 1, 'daughters': []},
            }

    Returns:
        list: divisions derived from lineage
            e.g. [{ 'parent': 1, 'daughters': [2, 3], 't': 1 }]

    """
    divisions = []
    lineage = {int(k): v for k, v in lineage.items()}
    for cell, info in lineage.items():
        parent, daughters, frame_div = (
            info['parent'],
            info['daughters'],
            info['frame_div'],
        )
        # Check for missing daughters
        if parent is not None:
            if cell not in lineage[parent]['daughters']:
                raise ValueError(
                    f'cell {cell} with parent {parent} not in daughters {lineage[parent]["daughters"]}'
                )
        if len(daughters) > 0:
            # Check for missing frame_div
            if frame_div is None:
                raise ValueError(f'cell {cell} missing frame_div')
            # Check for missing parent
            for d in daughters:
                if lineage[d]['parent'] != cell:
                    raise ValueError(
                        f'cell {cell} divides into cell {d} but parent of {d} is {lineage[d]["parent"]}'
                    )
            divisions.append({'parent': cell, 'daughters': daughters, 't': frame_div})
    return divisions


def reshape(array, input_axes, output_axes):
    """
    Reshapes an array with input_axes axis order to output_axes axis order.
    Axes order should be a string like 'ZYXCT'.

    Arguments:
        array (ndarray): array to reshape
        input_axes (string): dimension order of input array
        output_axes (string): dimension order after reshaping

    Returns:
        ndarray: reshaped array
    """
    if array.ndim != len(input_axes):
        print(
            f'input axis order {input_axes} '
            f'has more dimensions than array with shape {array.shape}'
        )
        print(f'truncating input axis order {input_axes} to {input_axes[:array.ndim]}')
        input_axes = input_axes[: array.ndim]
    dropped, input_axes = drop_axes(array, input_axes, output_axes)
    expanded, input_axes = expand_axes(dropped, input_axes, output_axes)
    permuted = permute_axes(expanded, input_axes, output_axes)
    assert len(permuted.shape) == len(output_axes)
    return permuted


def drop_axes(array, input_axes, output_axes):
    """
    Drops the dimensions in input_axes that are not in output_axes.
    Takes the first slice (index 0) of the dropped axes.

    Arguments:
        array (ndarray): array to drop
        input_axes (string): dimension order
        output_axes (string): dimension order

    Returns:
        ndarray: expanded array
        string: input_axes with axes not in output_axes removed
    """
    extra_axes = tuple(
        slice(None) if axis in output_axes else 0 for i, axis in enumerate(input_axes)
    )
    axes = ''.join(char for char in input_axes if char in output_axes)
    return array[extra_axes], axes


def expand_axes(array, input_axes, output_axes):
    """
    Adds the dimensions in output_axes that are not in input_axes.

    Arguments:
        array (ndarray): array to expand
        input_axes (string): dimension order
        output_axes (string): dimension order

    Returns:
        ndarray: expanded array
        axes: inpit axis order with missing dimensions inserted
    """
    missing_axes = tuple(
        i for i, axis in enumerate(output_axes) if axis not in input_axes
    )
    axes = input_axes
    for i in missing_axes:
        axes = axes[:i] + output_axes[i] + axes[i:]
    return np.expand_dims(array, axis=missing_axes), axes


def permute_axes(array, input_axes, output_axes):
    """
    Transpose the array with input_axes axis order to match output_axes axis order.
    Assumes that array has all the dimensions in output_axes,
    just in different orders, and drops/adds dims to the input axis order.

    Arguments:
        array (ndarray): array to transpose
        input_axes (string): dimension order
        output_axes (string): dimension order

    Returns:
        ndarray: transposed array
    """
    permutation = tuple(input_axes.find(dim) for dim in output_axes)
    return array.transpose(permutation)

def _get_sam_checkpoint(model_type: str) -> str:
    """Gets the path to a SAM model checkpoint.
    
    Arguments:
        model_type (str): Type of SAM model to load.
        
    Returns:
        str: Path to SAM model checkpoint (local).
    """
    weights_urls = {
        "default": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth",
        "vit_h": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth",
        "vit_l": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_l_0b3195.pth",
        "vit_b": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth",
    }
    
    cache_dir = Path.home() / ".cache/sam"
    cache_dir.mkdir(parents=True, exist_ok=True)
    weight_path = cache_dir / weights_urls[model_type].split("/")[-1]

    return weight_path

def _get_sam_model(model_type: str) -> Sam:
    """Loads a SAM model.
    
    Arguments:
        model_type (str): Type of SAM model to load.
        checkpoint_path (str): Path to SAM model checkpoint (local).
        
    Returns:
        Sam: SAM model.
    """
    checkpoint_path = _get_sam_checkpoint(model_type)

    return sam_model_registry[model_type](checkpoint=checkpoint_path)

def _get_preprocess_shape(oldh: int, oldw: int, long_side_length: int) -> Tuple[int, int]:
    """
    Compute the output size given input size and target long side length.
    """
    scale = long_side_length * 1.0 / max(oldh, oldw)
    newh, neww = oldh * scale, oldw * scale
    neww = int(neww + 0.5)
    newh = int(newh + 0.5)
    return (newh, neww)

def apply_sam_coords(coords: np.ndarray, original_size: Tuple[int, ...]) -> np.ndarray:
    """
    Expects a numpy array of length 2 in the final dimension. Requires the
    original image size in (H, W) format.
    """
    old_h, old_w = original_size
    new_h, new_w = _get_preprocess_shape(
        original_size[0], original_size[1], 1024
    )
    coords = deepcopy(coords).astype(float)
    coords[..., 0] = coords[..., 0] * (new_w / old_w)
    coords[..., 1] = coords[..., 1] * (new_h / old_h)
    return coords

def generate_image_embedding(sam_model: Sam, image: np.ndarray, output_path: str) -> None:
    """Generates an SamPredictor image embedding and saves it to a file.
    
    Arguments:
        sam_model (Sam): SAM model to generate embedding with.
        image (np.ndarray): Image to generate embedding for.
        output_path (str): Path to save embedding to.
    """
    predictor = SamPredictor(sam_model)
    predictor.set_image(image)

    image_embedding = predictor.get_image_embedding().cpu().numpy()

    np.save(output_path, image_embedding)

def generate_onnx_model(sam_model: Sam, original_image_width: int, original_image_height: int, output_path: str) -> None:
    """Generates an ONNX model from a SAM model.
    
    Arguments:
        sam_model (Sam): SAM model to convert to ONNX.
        original_image_width (int): Width of the original image.
        original_image_height (int): Height of the original image.
        output_path (str): Path to save ONNX model to.
    """
    onnx_model = SamOnnxModel(sam_model, return_single_mask=True)

    dynamic_axes = {
        "point_coords": {1: "num_points"},
        "point_labels": {1: "num_points"},
    }

    embed_dim = sam_model.prompt_encoder.embed_dim
    embed_size = sam_model.prompt_encoder.image_embedding_size
    mask_input_size = [4 * x for x in embed_size]
    dummy_inputs = {
        "image_embeddings": torch.randn(1, embed_dim, *embed_size, dtype=torch.float),
        "point_coords": torch.randint(low=0, high=1024, size=(1, 5, 2), dtype=torch.float),
        "point_labels": torch.randint(low=0, high=4, size=(1, 5), dtype=torch.float),
        "mask_input": torch.randn(1, 1, *mask_input_size, dtype=torch.float),
        "has_mask_input": torch.tensor([1], dtype=torch.float),
        "orig_im_size": torch.tensor([original_image_width, original_image_height], dtype=torch.float),
    }
    output_names = ["masks", "iou_predictions", "low_res_masks"]

    temp_path = "./deepcell_label/static/tmp.onnx"

    with open(temp_path, "wb") as f:
        torch.onnx.export(
            onnx_model,
            tuple(dummy_inputs.values()),
            f,
            export_params=True,
            verbose=False,
            opset_version=17,
            do_constant_folding=True,
            input_names=list(dummy_inputs.keys()),
            output_names=output_names,
            dynamic_axes=dynamic_axes,
        )

    quantize_dynamic(
        model_input=temp_path,
        model_output=output_path,
        per_channel=False,
        reduce_range=False,
        weight_type=QuantType.QUInt8,
    )

    os.remove(temp_path)

def process_image_for_sam(image_path: str, embedding_output_path: str, onnx_output_path: str) -> None:
    """Processes an image for SAM.
    
    Arguments:
        image_path (str): Path to image to process.
        embedding_output_path (str): Path to save image embedding to.
        onnx_output_path (str): Path to save ONNX model to.
    """
    print(image_path)
    print(os.getcwd())
    image = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    image = image.astype(np.uint8)

    sam_model = _get_sam_model("vit_h")

    generate_image_embedding(sam_model, image, embedding_output_path)

    generate_onnx_model(sam_model, image.shape[1], image.shape[0], onnx_output_path)

def retrieve_sam_model_data() -> Tuple[np.ndarray, onnxruntime.InferenceSession]:
    """Retrieves SAM model data; both the image embedding and the ONNX model.

    Returns:
        Tuple[np.ndarray, onnxruntime.InferenceSession]: Tuple containing the image embedding and the ONNX model.
    
    TODO: This should be rewritten to interact with S3 instead of a local static folder.
    """
    image_embedding = np.load("./deepcell_label/static/embedding.npy")
    ort_session = onnxruntime.InferenceSession("./deepcell_label/static/model.onnx")

    return image_embedding, ort_session

def generate_onnx_sam_masks(
        image_embedding: np.ndarray, 
        ort_session: onnxruntime.InferenceSession, 
        image: np.ndarray,
        bbox: BBox
    ) -> np.ndarray:
    """Generates masks from an image embedding and ONNX model.

    Arguments:
        image_embedding (np.ndarray): Image embedding to use.
        ort_session (onnxruntime.InferenceSession): ONNX model to use.
        image (np.ndarray): Image to generate masks for.
        bbox (dict): Bounding box to generate masks for.

    Returns:
        np.ndarray: Generated masks. For now only one mask is returned.
    """
    input_box = np.array([bbox.x_start, bbox.y_start, bbox.x_end, bbox.y_end])

    # Random for now until I figure out how to remove
    input_point = np.array([[0, 0]])
    input_label = np.array([0])

    onnx_box_coords = input_box.reshape(2, 2)
    onnx_box_labels = np.array([2,3])

    onnx_coord = np.concatenate([input_point, onnx_box_coords], axis=0)[None, :, :]
    onnx_label = np.concatenate([input_label, onnx_box_labels], axis=0)[None, :].astype(np.float32)

    onnx_coord = apply_sam_coords(onnx_coord, image.shape[:2]).astype(np.float32)

    onnx_mask_input = np.zeros((1, 1, 256, 256), dtype=np.float32)
    onnx_has_mask_input = np.zeros(1, dtype=np.float32)

    ort_inputs = {
        "image_embeddings": image_embedding,
        "point_coords": onnx_coord,
        "point_labels": onnx_label,
        "mask_input": onnx_mask_input,
        "has_mask_input": onnx_has_mask_input,
        "orig_im_size": np.array(image.shape[:2], dtype=np.float32)
    }

    masks, _, _ = ort_session.run(None, ort_inputs)
    masks = masks > 0.0

    return masks
