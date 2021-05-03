"""
"""

import io
import pytest
import numpy as np
import responses

from deepcell_label import url_loaders

# @responses.activate
# def test_load_raw_npz():
#     """Creates a dummy NPZ file with just a raw array and loads it."""
#     expected = np.zeros((1, 1, 1, 1))
#     npz = io.BytesIO()
#     np.savez(npz, X=expected)
#     npz.seek(0)
#     url = 'http://example.com/mocked/raw.npz'
#     responses.add(responses.GET, url, body=io.BufferedReader(npz))

#     loader = url_loaders.Loader({'url': url})

#     np.testing.assert_array_equal(loader.raw_array, expected)
#     np.testing.assert_array_equal(loader.label_array, expected)
#     assert loader.cell_ids is not None
#     assert loader.cell_info is not None
