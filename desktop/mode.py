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
        self.text = ""
        self.update_prompt()

    def __getattr__(self, attrib):
        if attrib in self.info:
            return self.info[attrib]
        raise AttributeError("Mode {} has no attribute '{}'".format(self, attrib))

    def __str__(self):
        return ("Mode('{}', ".format(self.kind) +
                ", ".join("{}={}".format(k, v) for k, v in self.info.items()) + ")")

    def clear(self):
        self.kind = None
        self.info = {}
        self.update_prompt()

    def update(self, kind, **info):
        self.kind = kind
        self.info = info
        self.update_prompt()

    def update_prompt_additions(self):
        '''
        Can be overridden by custom Caliban classes to implement specific prompts.
        '''
        pass

    def update_prompt(self):
        text = ""
        answer = "SPACE = CONFIRM\nESC = CANCEL"

        if self.kind == "SELECTED":
            text = "\nSELECTED {}".format(self.label)

        elif self.kind == "MULTIPLE":
            text = "\nSELECTED {}, {}".format(self.label_1, self.label_2)

        elif self.kind == "QUESTION":
            if self.action == "SAVE":
                text = ("\nSave current file?"
                    "\nSPACE = SAVE"
                    "\nESC = CANCEL")

            elif self.action == "REPLACE":
                text = ("\nReplace {} with {}?"
                    "\nSPACE = REPLACE IN ALL FRAMES"
                     "\nS = REPLACE IN FRAME {} ONLY"
                     "\nESC = CANCEL").format(self.label_2, self.label_1, self.frame_2)

            elif self.action == "SWAP":
                if self.frame_1 == self.frame_2:
                    text = ("\nSwap {} & {}?"
                        "\nSPACE = SWAP IN ALL FRAMES"
                        "\nS = SWAP IN FRAME {} ONLY"
                        "\nESC = CANCEL").format(self.label_2, self.label_1, self.frame_2)
                else:
                    text = ("\nSwap {} & {}?"
                        "\nSPACE = SWAP IN ALL FRAMES"
                        "\nESC = CANCEL").format(self.label_2, self.label_1)

            elif self.action == "PARENT":
                text = "\nMake {} a daughter of {}?\n{}".format(self.label_2, self.label_1, answer)

            elif self.action == "NEW TRACK":
                text = ("\nCreate new track from {0} in frame {1}?"
                    "\nSPACE = CREATE IN FRAME {1} AND ALL SUBSEQUENT FRAMES"
                    "\nS = CREATE IN FRAME {1} ONLY"
                    "\nESC = CANCEL").format(self.label, self.frame)

            elif self.action == "CREATE NEW":
                text = ("\nCreate new label from {0} in frame {1}?"
                    "\nSPACE = CREATE IN FRAME {1} AND ALL SUBSEQUENT FRAMES"
                    "\nS = CREATE IN FRAME {1} ONLY"
                    "\nESC = CANCEL").format(self.label, self.frame)

            elif self.action == "FLOOD CELL":
                text = ("\nFlood selected region of {} with new label in frame {}?"
                    "\n{}").format(self.label, self.frame, answer)

            elif self.action == "TRIM PIXELS":
                text = ("\nTrim unconnected pixels away from selected region of label {} in frame {}?"
                    "\n{}").format(self.label, self.frame, answer)

            elif self.action == "DELETE":
                text = ("\nDelete label {} in frame {}?"
                    "\n{}").format(self.label, self.frame, answer)

            elif self.action == "WATERSHED":
                text = ("\nPerform watershed to split {}?"
                    "\n{}").format(self.label_1, answer)

            elif self.action == "PREDICT":
                text = ("\nPredict 3D relationships between labels?"
                    "\nS = PREDICT THIS FRAME FROM PREVIOUS FRAME"
                    "\nSPACE = PREDICT ALL FRAMES"
                    "\nESC = CANCEL")

            elif self.action == "RELABEL":
                text = ("\nRelabel annotations?"
                    "\nSPACE = RELABEL IN ALL FRAMES"
                    "\nP = PRESERVE 3D INFO WHILE RELABELING"
                    "\nS = RELABEL THIS FRAME ONLY"
                    "\nU = UNIQUELY RELABEL EACH LABEL"
                    "\nESC = CANCEL")

        elif self.kind == "PROMPT":
            if self.action == "FILL HOLE":
                text = "\nSelect hole to fill in label {}.".format(self.label)

            elif self.action == "PICK COLOR":
                text = "\nClick on a label to change the brush value to that value."

            elif self.action == "DRAW BOX":
                text = "\nDraw a bounding box around the area you want to threshold."

            elif self.action == "CONVERSION BRUSH TARGET":
                text = "\nClick on the label you want to draw OVER."

            elif self.action == "CONVERSION BRUSH VALUE":
                text = ("\nClick on the label you want to draw WITH,"
                " or press N to set the brush to an unused label.")

        elif self.kind == "DRAW":
            text = ("\nUsing conversion brush to replace {} with {}."
                "\nUse ESC to stop using the conversion brush.").format(self.conversion_brush_target,
                self.conversion_brush_value)

        self.text = text
        self.update_prompt_additions()

    @staticmethod
    def none():
        return Mode(None)

class Mode2D(Mode):
    '''
    don't need any information about frames
    '''

    def update_prompt(self):
        text = ""
        answer = "\nSPACE = CONFIRM\nESC = CANCEL"

        if self.kind == "SELECTED":
            text = "\nSELECTED {}".format(self.label)

        elif self.kind == "MULTIPLE":
            text = "\nSELECTED {}, {}".format(self.label_1, self.label_2)

        elif self.kind == "QUESTION":
            if self.action == "SAVE":
                text = ("\nSave current file?"
                    "\nSPACE = SAVE"
                    "\nESC = CANCEL")

            elif self.action == "REPLACE":
                text = ("\nReplace {} with {}?"
                        + answer).format(self.label_2, self.label_1)

            elif self.action == "SWAP":
                text = ("\nSwap {} & {}?"
                        + answer).format(self.label_1, self.label_2)

            elif self.action == "CREATE NEW":
                text = ("\nCreate new label from label {0}?"
                        + answer).format(self.label)

            elif self.action == "FLOOD CELL":
                text = ("\nFlood selected region of {} with new label?"
                        + answer).format(self.label)

            elif self.action == "TRIM PIXELS":
                text = ("\nTrim unconnected pixels away from selected region of label {}?"
                    "\n{}").format(self.label, answer)

            elif self.action == "DELETE":
                text = ("\nDelete label {}?"
                        + answer).format(self.label)

            elif self.action == "WATERSHED":
                text = ("\nPerform watershed to split {}?"
                        + answer).format(self.label_1)

            elif self.action == "RELABEL":
                text = ("\nRelabel annotations?"
                        + answer)

        elif self.kind == "PROMPT":
            if self.action == "FILL HOLE":
                text = "\nSelect hole to fill in label {}.".format(self.label)

            elif self.action == "PICK COLOR":
                text = "\nClick on a label to change the brush value to that value."

            elif self.action == "DRAW BOX":
                text = "\nDraw a bounding box around the area you want to threshold."

            elif self.action == "CONVERSION BRUSH TARGET":
                text = "\nClick on the label you want to draw OVER."

            elif self.action == "CONVERSION BRUSH VALUE":
                text = ("\nClick on the label you want to draw WITH,"
                " or press N to set the brush to an unused label.")

        elif self.kind == "DRAW":
            text = ("\nUsing conversion brush to replace {} with {}."
                "\nUse ESC to stop using the conversion brush.").format(self.conversion_brush_target,
                self.conversion_brush_value)

        self.text = text
        self.update_prompt_additions()

    @staticmethod
    def none():
        return Mode2D(None)


# TODO: further subclassing would probably be appropriate
# class Mode3D(Mode):


# class ModeTrack(Mode3D):