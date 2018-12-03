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
                return ("\nreplace {} with ".format(self.label_2)
                        + "{}?\n {}".format(self.label_1, answer))
            elif self.action == "SWAP":
                return ("\nswap {} & {}?\n {}".format(self.label_2, self.label_1, answer))
            elif self.action == "PARENT":
                return ("\nmake {} a daughter of ".format(self.label_2)
                        + "{}\n {}".format(self.label_1, answer))
            elif self.action == "NEW TRACK":
                return ("\nnew track cell:{}/frame:{}?".format(self.label, self.frame)
                        + "\n {}".format(answer))
            elif self.action == "WATERSHED":
                return ("\nperform watershed to split {}".format(self.label_1))
        else:
            return ''


    @staticmethod
    def none():
        return Mode(None)
