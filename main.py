"""Echo server using the asyncio API."""

import asyncio
import json
import time
from websockets.asyncio.server import serve
from collections import deque
import gaze_tracking as gt
from chatbot import chatbot


start_times = deque(maxlen=50)
previous_scroll = time.time() * 1000
cur_start = time.time() * 1000
maximum_duration = 0
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
                    gt.Continue_state = True
                    asyncio.create_task(asyncio.to_thread(gt.gaze_tracking_main))
            case "scroll":
                global previous_scroll, cur_start, maximum_duration
                # print(f"Received scroll: {value}")
                if value["time"] - previous_scroll <= 200:
                    maximum_duration = max(maximum_duration, value["time"] - cur_start)
                else:
                    cur_start = value["time"]
                    start_times.append(cur_start)
                previous_scroll = value["time"]
            case "focus":
                # print(f"### {gt.Focus}")
                await websocket.send(
                    json.dumps({"type": "focus", "value": (is_focus and gt.Focus)})
                    # json.dumps({"type": "focus", "value": False})
                    # json.dumps({"type": "focus", "value": (gt.Focus)})
                )
            case "input":
                # print(f"Received input: {value}")
                # TODO: Implement Deepseek API
                res = await asyncio.to_thread(
                    chatbot, value["message"], value["webpage"], value["tabId"]
                )
                await websocket.send(
                    json.dumps(
                        {
                            "type": "response",
                            "value": {
                                "message": res,
                                "tabId": value["tabId"],
                                "fromPopup": value["fromPopup"],
                            },
                        }
                    )
                )
            case "stop":
                gt.Continue_state = False
                print("Received exit. Closing backend.")
                image_base64 = gt.graph_generate()

                await websocket.send(json.dumps({
                    "type": "image",
                    "value": image_base64
                }))
                return


async def data_analysis():
    while True:
        analyze_mouse(start_times)
        await asyncio.sleep(60)


def analyze_mouse(data: deque):
    global is_focus, previous_scroll, maximum_duration
    maximum_idle_seconds = 60
    maximum_move_seconds = 15
    maximum_move_counts = 15

    print("----- Analyzing mouse activity -----")
    print(f"Data length: {len(data)}")
    print(f"Max scroll duration: {maximum_duration}")
    print(f"Time since last scroll (ms): {time.time()*1000 - previous_scroll}")

    if len(data) > 0:
        print(f"Oldest scroll: {data[0]}")
    while len(data) > 0 and time.time() * 1000 - data[0] > 60000:
        data.popleft()

    if len(data) >= maximum_move_counts:
        is_focus = False
    elif maximum_duration > maximum_move_seconds * 1000:
        is_focus = False
    elif time.time() * 1000 - previous_scroll >= maximum_idle_seconds * 1000:
        is_focus = False
    else:
        is_focus = True
    for _ in range(60):
        gt.Focus_flow.append(is_focus)
    print(f"is_focus: {is_focus}")
    print("------------------------------------")

    # Reset scroll duration for next window
    maximum_duration = 0


async def main():
    asyncio.create_task(data_analysis())
    async with serve(handler, "localhost", 8765) as server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
