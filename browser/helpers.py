import os


ALLOWED_EXTENSIONS = set([
    '.txt', '.md', '.markdown', '.pdf',
    '.png', '.jpg', '.jpeg', '.gif',
])

ALLOWED_IMAGE_EXTENSIONS = set([
    '.npz', '.trk', '.trks', '.png',
    '.tif', '.tiff',
])


def allowed_file(name):
    return os.path.splitext(str(name).lower())[-1] in ALLOWED_EXTENSIONS


def is_valid_file(name):
    return is_zstack_file(name) or is_track_file(name)


def is_track_file(name):
    '''Determines if a given file is a trk or trks file.

    Args:
        name (str): potential trk or trks filename.

    Returns:
        bool: True if the file is trk or trks, otherwise False.
    '''
    return os.path.splitext(str(name).lower())[-1] in {'.trk', '.trks'}


def is_zstack_file(name):
    '''Determines if a given file is a npz file.

    Args:
        name (str): potential npz filename.

    Returns:
        bool: True if the file is npz, otherwise False.
    '''
    return os.path.splitext(str(name).lower())[-1] in {'.npz', '.png', '.tif', '.tiff'}
