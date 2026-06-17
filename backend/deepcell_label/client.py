import asyncio
import pickle
import zlib

import websockets
from flask import current_app

from deepcell_label.config import CELLSAM_IP, CELLSAM_PORT


# connects to cell SAM server
async def perform_send(to_send):
    uri = f'ws://{CELLSAM_IP}:{CELLSAM_PORT}'

    async with websockets.connect(uri, ping_interval=None) as websocket:
        data = {'img': to_send}
        pkt = zlib.compress(pickle.dumps(data))
        await websocket.send(pkt)

        pkt_received = await websocket.recv()

        mask = pickle.loads(zlib.decompress(pkt_received))
        return mask


def send_to_server(to_send):
    current_app.logger.info('Sent to server to generate mask for cellSAM')
    mask = asyncio.run(perform_send(to_send))
    return mask
