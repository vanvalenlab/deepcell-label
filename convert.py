from utils import data_utils

import argparse
import pathlib


def parse_args():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--npz_to_trks",
                       action="store_true",
                       help="Converts *.npz and *kids.npz files to .trks "
                            "file. An accompanying *kids.npz file must exist "
                            " in the same directory as the source *.npz file.")

    group.add_argument("--trks_to_folder",
                       action="store_true",
                       help="Converts *.npz and *kids.npz files to .trks "
                            "file. An accompanying *kids.npz file must exist "
                            " in the same directory as the source *.npz file.")
    parser.add_argument("source",
                        type=str,
                        help="The file or folder to use as the source of "
                             "conversion. For example, when using the "
                             "--npz_to_trks mode, this should be the "
                             "non 'kids' .npz file.")
    parser.add_argument("destination",
                        type=str,
                        nargs="?",
                        help="The file or folder to use as the destination "
                             "for conversion. If this is not passed in then "
                             "the destination will have an inferred name and "
                             "appear in the same directory as the source. If "
                             "provided, it must have the correct extension, "
                             "if any.")
    return parser.parse_args()


def main():
    args = parse_args()
    if args.npz_to_trks:
        file = pathlib.Path(args.source)
        kids = str(file.parent / file.stem) + "_kids.npz"
        if args.destination:
            dest = args.destination
        else:
            dest = file.with_suffix(".trks")
        data_utils.npz_and_kids_to_trks(str(file), str(kids), str(dest))
    elif args.trks_to_folder:
        file = pathlib.Path(args.source)
        if args.destination:
            dest = args.destination
        else:
            dest = file.parent / file.stem
        data_utils.trks_to_trk_folder(str(file), str(dest))
    else:
        raise NotImplemented

if __name__ == "__main__":
    main()
