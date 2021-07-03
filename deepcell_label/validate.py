"""
Computes inconsistencies between semantic labels and instance labels.
"""

class Validator():

    def __init__(self, project, feature):
        self.project = project
        self.semantic_labels = project.labels.cell_info[feature]
        self.instance_labels = project.label_array[...,feature]
        self.warnings = []

        self.validate_divisions()

    def add_warning(self, warning):
        self.warnings.append(warning)

    def validate_divisions(self):
        for label in self.semantic_labels:
            self.validate_division(label)

    def validate_division(self, label):
        label_info = self.semantic_labels[label]
        frame = label_info['frame_div']
        daughters = label_info['daughters']

        if frame is None:
            assert daughters == []
            return

        instances_before_division = self.instance_labels[:frame]
        instances_after_division = self.instance_labels[frame:]

        if label in instances_after_division:
            self.add_warning(f'Parent {label} present after division in frame {frame}')

        for daughter in daughters:
            if daughter in instances_before_division:
                self.add_warning(f'Daughter {daughter} present before division in frame {frame}')

        if len(daughters) == 1:
            self.add_warning(f'Parent {label} has only one daughter {daughters[0]}')
