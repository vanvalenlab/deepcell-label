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
        self.frame_text = ""
        self.simple_answer = "SPACE = CONFIRM\nESC = CANCEL"

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

    def fill_frame_text(self):
        return ""

    def update_prompt_additions(self):
        '''
        Can be overridden by custom Caliban classes to implement specific prompts.
        '''
        pass

    def set_prompt_text(self):
        if self.action == "FILL HOLE":
            self.text = "\nSelect hole to fill in label {}.".format(self.label)

        elif self.action == "PICK COLOR":
            self.text = "\nClick on a label to change the brush value to that value."

        elif self.action == "DRAW BOX":
            self.text = "\nDraw a bounding box around the area you want to threshold."

        elif self.action == "CONVERSION BRUSH TARGET":
            self.text = "\nClick on the label you want to draw OVER."

        elif self.action == "CONVERSION BRUSH VALUE":
            self.text = ("\nClick on the label you want to draw WITH,"
                         " or press N to set the brush to an unused label.")

    def set_question_single(self):
        if self.action == "FLOOD CELL":
            frame_insert = self.fill_frame_text()
            self.text = ("\nFlood selected region of {} with new label{}?"
                         "\n{}").format(self.label, frame_insert, self.simple_answer)

        elif self.action == "TRIM PIXELS":
            frame_insert = self.fill_frame_text()
            self.text = ("\nTrim unconnected pixels away from selected region of label {}{}?"
                         "\n{}").format(self.label, frame_insert, self.simple_answer)

        elif self.action == "DELETE":
            frame_insert = self.fill_frame_text()
            self.text = ("\nDelete label {}{}?"
                         "\n{}").format(self.label, frame_insert, self.simple_answer)

    def set_question_multiframe_options(self):
        if self.action == "REPLACE":
            self.text = ("\nReplace {} with {}?"
                         "\nSPACE = REPLACE IN ALL FRAMES"
                         "\nS = REPLACE IN FRAME {} ONLY"
                         "\nESC = CANCEL").format(self.label_2, self.label_1, self.frame_2)

        elif self.action == "SWAP":
            if self.frame_1 == self.frame_2:
                self.text = ("\nSwap {} & {}?"
                             "\nSPACE = SWAP IN ALL FRAMES"
                             "\nS = SWAP IN FRAME {} ONLY"
                             "\nESC = CANCEL").format(self.label_2, self.label_1, self.frame_2)
            else:
                self.text = ("\nSwap {} & {}?"
                             "\nSPACE = SWAP IN ALL FRAMES"
                             "\nESC = CANCEL").format(self.label_2, self.label_1)

        elif self.action == "CREATE NEW":
            self.text = ("\nCreate new label from {0} in frame {1}?"
                         "\nSPACE = CREATE IN FRAME {1} AND ALL SUBSEQUENT FRAMES"
                         "\nS = CREATE IN FRAME {1} ONLY"
                         "\nESC = CANCEL").format(self.label, self.frame)

        elif self.action == "PREDICT":
            self.text = ("\nPredict 3D relationships between labels?"
                         "\nS = PREDICT THIS FRAME FROM PREVIOUS FRAME"
                         "\nSPACE = PREDICT ALL FRAMES"
                         "\nESC = CANCEL")

        elif self.action == "RELABEL":
            self.text = ("\nRelabel annotations?"
                         "\nSPACE = RELABEL IN ALL FRAMES"
                         "\nP = PRESERVE 3D INFO WHILE RELABELING"
                         "\nS = RELABEL THIS FRAME ONLY"
                         "\nU = UNIQUELY RELABEL EACH LABEL"
                         "\nESC = CANCEL")

    def update_prompt(self):
        self.text = ""

        if self.kind == "SELECTED":
            self.text = "\nSELECTED {}".format(self.label)

        elif self.kind == "MULTIPLE":
            self.text = "\nSELECTED {}, {}".format(self.label_1, self.label_2)

        elif self.kind == "QUESTION":

            self.set_question_single()

            self.set_question_multiframe_options()

            if self.action == "SAVE":
                self.text = ("\nSave current file?"
                             "\nSPACE = SAVE"
                             "\nESC = CANCEL")

            elif self.action == "WATERSHED":
                self.text = ("\nPerform watershed to split {}?"
                             "\n{}").format(self.label_1, self.simple_answer)

        elif self.kind == "PROMPT":
            self.set_prompt_text()

        elif self.kind == "DRAW":
            self.text = ("\nUsing conversion brush to replace {} with {}."
                         "\nUse ESC to stop using the conversion brush.").format(
                self.conversion_brush_target, self.conversion_brush_value)

        self.update_prompt_additions()

    @staticmethod
    def none():
        return Mode(None)


class Mode2D(Mode):
    '''
    don't need any information about frames
    '''

    def __init__(self, kind, **info):
        super().__init__(kind, **info)
        self.update_prompt()

    def set_question_multiframe_options(self):
        if self.kind == "QUESTION":

            if self.action == "REPLACE":
                self.text = "\nReplace {} with {}?\n{}".format(
                    self.label_2, self.label_1, self.simple_answer)

            elif self.action == "SWAP":
                self.text = "\nSwap {} & {}?\n".format(
                    self.label_1, self.label_2, self.simple_answer)

            elif self.action == "CREATE NEW":
                self.text = "\nCreate new label from label {}?\n{}".format(
                    self.label, self.simple_answer)

            elif self.action == "RELABEL":
                self.text = "\nRelabel annotations?\n{}".format(self.simple_answer)

    @staticmethod
    def none():
        return Mode2D(None)


class Mode3D(Mode):

    def __init__(self, kind, **info):
        super().__init__(kind, **info)
        self.frame_text = " in frame {}"
        self.update_prompt()

    def fill_frame_text(self):
        return self.frame_text.format(self.frame)

    def update_prompt(self):
        super().update_prompt()

        if self.kind == "QUESTION":
            if self.action == "SAVE":
                self.text = ("\nSave current file?"
                             "\nSPACE = SAVE"
                             "\nT = SAVE AS .TRK FILE"
                             "\nESC = CANCEL")

    @staticmethod
    def none():
        return Mode3D(None)


class ModeTrack(Mode3D):

    def update_prompt(self):
        super().update_prompt()

        if self.kind == "QUESTION":
            if self.action == "SAVE":
                self.text = ("\nSave current file?"
                             "\nSPACE = SAVE"
                             "\nESC = CANCEL")

            elif self.action == "PARENT":
                self.text = "\nMake {} a daughter of {}?\n{}".format(
                    self.label_2, self.label_1, self.simple_answer)

            elif self.action == "NEW TRACK":
                self.text = ("\nCreate new track from {0} in frame {1}?"
                             "\nSPACE = CREATE IN FRAME {1} AND ALL SUBSEQUENT FRAMES"
                             "\nS = CREATE IN FRAME {1} ONLY"
                             "\nESC = CANCEL").format(self.label, self.frame)

            elif self.action == "REPLACE":
                self.text = ("\nReplace {} with {}?"
                             "\nSPACE = REPLACE IN ALL FRAMES"
                             "\nESC = CANCEL").format(self.label_2, self.label_1)

    @staticmethod
    def none():
        return ModeTrack(None)
