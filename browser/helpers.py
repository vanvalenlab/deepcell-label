import os


ALLOWED_TRACK_EXTENSIONS = set(['.trk', '.trks'])
ALLOWED_ZSTACK_EXTENSIONS = set(['.npz', '.png', '.tif', '.tiff'])
ALLOWED_EXTENSIONS = ALLOWED_TRACK_EXTENSIONS | ALLOWED_ZSTACK_EXTENSIONS


def allowed_file(name):
    return os.path.splitext(str(name).lower())[-1] in ALLOWED_EXTENSIONS


def is_track_file(name):
    '''Determines if a given file is a trk or trks file.

    Args:
        name (str): potential trk or trks filename.

    Returns:
        bool: True if the file is trk or trks, otherwise False.
    '''
    return os.path.splitext(str(name).lower())[-1] in ALLOWED_TRACK_EXTENSIONS


def is_zstack_file(name):
    '''Determines if a given file is a npz file.

    Args:
        name (str): potential npz filename.

    Returns:
        bool: True if the file is npz, otherwise False.
    '''
    return os.path.splitext(str(name).lower())[-1] in ALLOWED_ZSTACK_EXTENSIONS
