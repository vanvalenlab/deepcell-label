import asyncio

# import base64
import json

import numpy as np
import websockets
from flask import current_app

# import zlib


def convert_to_json(to_send, label):
    # # to_send_converted = base64.b64encode(to_send).decode('utf-8')
    # # np.resize(to_send, (256, 256, 2))
    # print(to_send.shape)
    # # if len(to_send.shape) == 4:
    # #     to_send = to_send[:2, :256, :256, :2]
    # # print(to_send.shape)
    msg = {
        'data': to_send.ravel().tolist(),
        # 'data': to_send_converted,
        'shape': to_send.shape,
        'dtype': to_send.dtype.descr[0][-1],
        'label': label,
    }
    print(to_send.shape)
    return json.dumps(msg)


async def perform_send(to_send, label):
    uri = 'ws://131.215.2.183:8765'
    async with websockets.connect(uri) as websocket:
        packet = convert_to_json(to_send, label)
        await websocket.send(packet)
        print('sent')
        serialized = await websocket.recv()
        if serialized != 'yes':
            msg = json.loads(serialized)
            mask = np.array(msg['data'], dtype=msg['dtype']).reshape(msg['shape'])
            np.save('deepcell_label/mask.npy', mask)


# def send_to_server(to_send, label):
#     current_app.logger.info('Sent to server to generate mask for cellSAM')
#     asyncio.run(perform_send(to_send, label))


def send_to_server(to_send, label):
    current_app.logger.info('Sent to server to generate mask for cellSAM')
    asyncio.run(perform_send(to_send, label))
