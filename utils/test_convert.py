from data_utils import *

direc = "/deepcell_data/npz_data/cells/HeLa/S3/movie/"
name = "nuclear_movie_hela0-7_same"

npz_and_kids_to_trks(direc + name + ".npz",
                     direc + name + "_kids.npz",
                     "../../data/hela0-7.trks")

