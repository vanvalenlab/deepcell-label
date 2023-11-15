from pydantic import BaseModel

class BBox(BaseModel):
    x_start: int
    y_start: int
    x_end: int
    y_end: int
