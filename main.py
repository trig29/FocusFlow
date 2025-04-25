"""Echo server using the asyncio API."""

import asyncio
import json
import time
from websockets.asyncio.server import serve
from collections import deque
import gaze_tracking as gt

scroll_data = deque(maxlen=500)
is_focus = True
sum = 0


async def handler(websocket):
    async for message in websocket:
        if message == "keepalive":
            continue
        try:
            message = json.loads(message)
            value = message["value"]
        except json.JSONDecodeError:
            print("Invalid JSON received")
            return
        match message["type"]:
            case "corner":
                print(f"Received corner: {value}")
                gt.gaze_tracking_initialization(value)
                global sum
                sum += 1
                if sum == 4:
                    await asyncio.to_thread(gt.gaze_tracking_main)
                    pass
            case "scroll":
                print(f"Received scroll: {value}")
                scroll_data.append(value)
            case "focus":
                await websocket.send(
                    # json.dumps({"type": "focus", "value": (is_focus and gt.Focus)})
                    json.dumps({"type": "focus", "value": False})
                )
            case "input":
                print(f"Received input: {value}")
                # TODO: Implement Deepseek API
                time.sleep(1)
                await websocket.send(
                    json.dumps(
                        {
                            "type": "response",
                            "value": {"time": value["time"], "message": "Test message"},
                        }
                    )
                )


async def data_analysis():
    while True:
        analyze_mouse(scroll_data)
        scroll_data.clear()
        await asyncio.sleep(60)


def analyze_mouse(data: deque):
    maximum_idle_minutes = 0
    maximum_move_counts = 1
    global is_focus
    if len(data) == 0:
        is_focus = False
        return
    while int(time.time() * 1000) - data[0]["time"] > maximum_idle_minutes * 60 * 1000:
        print(f"Data: {data[0]}")
        data.popleft()
        if len(data) == maximum_move_counts:
            is_focus = False

        else:
            is_focus = True
    print(is_focus)


async def main():
    asyncio.create_task(data_analysis())
    async with serve(handler, "localhost", 8765) as server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
