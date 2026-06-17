import asyncio
import os
import pickle
import zlib

import websockets
from flask import current_app


# connects to cell SAM server
async def perform_send(to_send):
    uri = os.environ['CELLSAM_SERVER']  # to be replaced with cell SAM server uri
    async with websockets.connect(uri, ping_interval=None) as websocket:
        data = {'img': to_send}
        print(uri)
        pkt = zlib.compress(pickle.dumps(data))
        await websocket.send(pkt)
        print('sent')
        pkt_received = await websocket.recv()
        print('received')
        mask = pickle.loads(zlib.decompress(pkt_received))
        return mask


def send_to_server(to_send):
    current_app.logger.info('Sent to server to generate mask for cellSAM')
    mask = asyncio.run(perform_send(to_send))
    return mask
