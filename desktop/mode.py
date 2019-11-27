# Copyright 2018-2019 The Van Valen Lab at the California Institute of
# Technology (Caltech), with support from the Paul Allen Family Foundation,
# Google, & National Institutes of Health (NIH) under Grant U24CA224309-01.
# All rights reserved.
#
# Licensed under a modified Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.github.com/vanvalenlab/Caliban/LICENSE
#
# The Work provided may be used for non-commercial academic purposes only.
# For any other use of the Work, including commercial use, please contact:
# vanvalenlab@gmail.com
#
# Neither the name of Caltech nor the names of its contributors may be used
# to endorse or promote products derived from this software without specific
# prior written permission.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""Select different render modes."""
class Mode:
    def __init__(self, kind, **info):
        self.kind = kind
        self.info = info

    def __getattr__(self, attrib):
        if attrib in self.info:
            return self.info[attrib]
        raise AttributeError("Mode {} has no attribute '{}'".format(self, attrib))

    def __str__(self):
        return ("Mode('{}', ".format(self.kind) +
                ", ".join("{}={}".format(k, v) for k, v in self.info.items()) + ")")

    def render(self):
        if self.kind is None:
            return ''
        answer = "(SPACE=YES / ESC=NO)"

        try:
            filetype = self.info['filetype']
        except KeyError:
            filetype = ""

        if self.kind == "SELECTED":
            return "\nSELECTED {}".format(self.label)
        elif self.kind == "MULTIPLE":
            return "\nSELECTED {}, {}".format(self.label_1, self.label_2)
        elif self.kind == "QUESTION":
            if self.action == "SAVE":
                if filetype == "npz":
                    return ("\nSave current movie?\nSPACE=SAVE\nT=SAVE AS .TRK FILE\nESC=CANCEL")
                else:
                    return ("\nSave current movie?\nSPACE=SAVE\nESC=CANCEL")
            elif self.action == "REPLACE":
                return ("\nreplace {} with {}?\n {}".format(self.label_2, self.label_1,
                 '\nSPACE = REPLACE IN ALL FRAMES\nS = REPLACE IN THIS FRAME ONLY\nESC = CANCEL REPLACE'))
            elif self.action == "SWAP":
                return ("\nswap {} & {}?\n{}".format(self.label_2, self.label_1,
                '\nSPACE = SWAP IN ALL FRAMES\nS = SWAP IN THIS FRAME ONLY\nESC = CANCEL SWAP'))
            elif self.action == "PARENT":
                return ("\nmake {} a daughter of {}?\n {}".format(self.label_2, self.label_1, answer))
            elif self.action == "NEW TRACK":
                return ("\ncreate new track from {} on frame {}?".format(self.label, self.frame) +
                    "\n {}".format("(S=SINGLE FRAME / SPACE=ALL SUBSEQUENT FRAMES / ESC=NO)"))
            elif self.action == "CREATE NEW":
                return ("".format(self.label, self.frame)
                        + "\n {}".format("(S=SINGLE FRAME / SPACE=ALL SUBSEQUENT FRAMES / ESC=NO)"))
            elif self.action == "FLOOD CELL":
                return('\nSPACE = FLOOD SELECTED CELL WITH NEW LABEL\nESC = CANCEL')
            elif self.action == "TRIM PIXELS":
                return('\nSPACE = TRIM DISCONTIGUOUS PIXELS FROM CELL\nESC = CANCEL')
            elif self.action == "DELETE":
                return ('\nDelete label {} in frame {}?\n{}'.format(self.label, self.frame,
                "SPACE = CONFIRM DELETION\nESC = CANCEL DELETION"))
            elif self.action == "WATERSHED":
                return ("\nperform watershed to split {}?\n{}".format(self.label_1, answer))
            elif self.action == "PREDICT":
                return ("Predict cell ids for zstack?\nS=PREDICT THIS FRAME\nSPACE=PREDICT ALL FRAMES\nESC=CANCEL PREDICTION")
            elif self.action == "RELABEL":
                return ("Relabel cells?\nSPACE=RELABEL ALL FRAMES\nP=PRESERVE 3D INFO\nS=RELABEL THIS FRAME ONLY\nU=UNIQUELY RELABEL EACH CELL\nESC=CANCEL")
        elif self.kind == "PROMPT":
            if self.action == "FILL HOLE":
                return('\nselect hole to fill in cell {}'.format(self.label))
            elif self.action == "PICK COLOR":
                return('\nclick on a cell to change the brush value to that value')
            elif self.action == "DRAW BOX":
                return('\ndraw a bounding box around the area you want to threshold')
            elif self.action == "START SNAKE":
                return('\nclick to select a starting point for contour prediction')
            elif self.action == "END SNAKE":
                return('\nclick to select an ending point for contour prediction')
            elif self.action == "CONVERSION BRUSH TARGET":
                return('\nclick on the label you want to draw OVER')
            elif self.action == "CONVERSION BRUSH VALUE":
                return('\nclick on the label you want to draw WITH')
        elif self.kind == "DRAW":
            # return('\nusing conversion brush to replace {} with {}'.format(self.info['conversion_brush_target'],
            #     self.info['conversion_brush_value']))
            return('\nusing conversion brush to replace {} with {}\nuse ESC to leave this mode'.format(self.conversion_brush_target,
                self.conversion_brush_value))
        else:
            return ''


    @staticmethod
    def none():
        return Mode(None)
