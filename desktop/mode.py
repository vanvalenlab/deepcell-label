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

        if self.kind == "SELECTED":
            return "\nSELECTED {}".format(self.label)
        elif self.kind == "MULTIPLE":
            return "\nSELECTED {}, {}".format(self.label_1, self.label_2)
        elif self.kind == "QUESTION":
            if self.action == "SAVE":
                return ("\nsave current movie?\n {}".format(answer))
            elif self.action == "REPLACE":
                return ("\nreplace {} with {}?\n {}".format(self.label_2, self.label_1, answer))
            elif self.action == "SWAP":
                return ("\nswap {} & {}?\n {}".format(self.label_2, self.label_1, "(S=SINGLE FRAME / SPACE=ALL FRAMES / ESC=NO)"))
            elif self.action == "PARENT":
                return ("\nmake {} a daughter of {}?\n {}".format(self.label_2, self.label_1, answer))
            elif self.action == "NEW TRACK":
                return ("\ncreate new track from {} on frame {}?\n {}".format(self.label, self.frame, answer))
            elif self.action == "WATERSHED":
                return ("\nperform watershed to split {}?\n {}".format(self.label_1, answer))
            elif self.action == "DELETE":
                return ("\ndelete {} from frame {}?\n {}".format(self.label, self.frame, answer))
        else:
            return ''


    @staticmethod
    def none():
        return Mode(None)
