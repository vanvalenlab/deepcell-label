"""Utility functions for DeepCell Label"""

import re


def add_frame_div_parent(cell_info):
    """
    Adds the frame a cells parent divides on to cell info.

    Args:
        cell_info (dict): dict that maps cells to cell info
    Returns:
        dict: cell info with added frame_div_parent
    """
    new_info = cell_info.copy()
    for info in new_info.values():
        if info['parent']:
            parent = info['parent']
            info['frame_div_parent'] = new_info[parent]['frame_div']
        else:
            info['frame_div_parent'] = None
    return new_info


def snakecase_to_camelcase(name):
    snake_pattern = re.compile(r'_([a-z])')
    return snake_pattern.sub(lambda x: x.group(1).upper(), name)


def reformat_cell_info(cell_info):
    """
    Reformats snake case to camel case and renames frame_div to divisionFrame.
    """
    reformated = {}
    for cell, info in cell_info.items():
        reformated[cell] = {}
        for key in info:
            if key == 'frame_div':
                reformated[cell]['divisionFrame'] = info[key]
            elif key == 'frame_div_parent':
                reformated[cell]['parentDivisionFrame'] = info[key]
            else:
                reformated[cell][snakecase_to_camelcase(key)] = info[key]
    return reformated
