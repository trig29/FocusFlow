import mediapipe as mp
import cv2
import gaze
import time
import numpy as np
import data_processing as dp
from collections import deque
import matplotlib.pyplot as plt
import base64
from io import BytesIO
import os

Focus = True
Focus_flow = []
Initialized_direaction = [None, None, None, None, None]
Continue_state = True

class SlidingWindow:
    def __init__(self, maxlen=10):
        self.maxlen = maxlen
        self.queue = deque()
        self.running_sum = np.zeros(3, dtype=float)

    def append(self, arr):
        arr = np.array(arr, dtype=float)
        if np.isnan(arr).any():
            return
        if len(self.queue) == self.maxlen:
            removed = self.queue.popleft()
            self.running_sum -= removed
        self.queue.append(arr)
        self.running_sum += arr

    def mean(self):
        if not self.queue:
            return np.zeros(3, dtype=float)
        return self.running_sum / len(self.queue)
    
mp_face_mesh = mp.solutions.face_mesh
cap = cv2.VideoCapture(0)

def webcam_checker():
    if not cap.isOpened():
        print("Webcam is not enabled or not available.")
        #TODO
        #前端输出：“请打开摄像头字样”

def graph_generate():
    y = np.array([1 if val else -1 for val in Focus_flow])
    x_raw = np.linspace(0, 100, len(y))
    percent_ticks = [0, 25, 50, 75, 100]

    fig = plt.figure(figsize=(12, 5))

    plt.subplot(1, 2, 1)
    focused_count = np.sum(y == 1)
    distracted_count = np.sum(y == -1)

    plt.pie(
        [focused_count, distracted_count],
        labels=['Focused', 'Distracted'],
        colors=['green', 'red'],
        autopct='%1.1f%%',
        startangle=90,
        counterclock=False
    )
    plt.title("Focus Distribution")

    plt.subplot(1, 2, 2)

    for i in range(len(x_raw) - 1):
        x_fill = [x_raw[i], x_raw[i + 1]]
        y_fill = [y[i], y[i + 1]]
        if y[i] >= 0 and y[i + 1] >= 0:
            plt.fill_between(x_fill, y_fill, 0, color='lightgreen')
        elif y[i] <= 0 and y[i + 1] <= 0:
            plt.fill_between(x_fill, y_fill, 0, color='lightcoral')
        else:
            x0, x1 = x_fill
            y0, y1 = y_fill
            x_cross = x0 + (0 - y0) * (x1 - x0) / (y1 - y0)
            plt.fill_between([x0, x_cross], [y0, 0], 0,
                            color='lightgreen' if y0 > 0 else 'lightcoral')
            plt.fill_between([x_cross, x1], [0, y1], 0,
                            color='lightgreen' if y1 > 0 else 'lightcoral')

    for i in range(1, len(x_raw)):
        x_pair = [x_raw[i - 1], x_raw[i]]
        y_pair = [y[i - 1], y[i]]
        if y[i - 1] >= 0 and y[i] >= 0:
            color = 'green'
        elif y[i - 1] <= 0 and y[i] <= 0:
            color = 'red'
        else:
            x0, x1 = x_pair
            y0, y1 = y_pair
            x_cross = x0 + (0 - y0) * (x1 - x0) / (y1 - y0)
            plt.plot([x0, x_cross], [y0, 0], color='green' if y0 > 0 else 'red', linewidth=2)
            plt.plot([x_cross, x1], [0, y1], color='green' if y1 > 0 else 'red', linewidth=2)
            continue
        plt.plot(x_pair, y_pair, color=color, linewidth=2)

    plt.axhline(0, color='black', linewidth=0.5, linestyle='--')
    plt.xticks(percent_ticks, [f"{p}%" for p in percent_ticks])
    plt.yticks([-1, 1], ["Distracted", "Focused"])
    plt.xlabel("Progress")
    plt.title("Focus Over Time (Line Chart)")
    plt.grid(True, axis='y', linestyle='--', alpha=0.3)
    plt.tight_layout()

    buffer = BytesIO()
    fig.savefig(buffer, format='png')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    return image_base64

def gaze_tracking_initialization(direaction):

    #在前端完成所有关于初始化的提示等功能，只在开始检测用户视线时调用该Initialization函数
    # direaction = 1为左上角，2为右上角，3为左下角，4为右下角
    #目前想法是先倒计时3秒（倒计时F），结束后调用该函数，开始盯着角落五秒（倒计时S），
    # 结束后函数将初始化值储存到后端，换下一个角落。
    webcam_checker()
    data = []

    with mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5) as face_mesh:
        start_time = time.time()
        while cap.isOpened() and time.time() - start_time < 3:
            success, image = cap.read()
            if not success:
                print("Ignoring empty camera frame.")
                continue
            image.flags.writeable = False
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(image)
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

            if results.multi_face_landmarks:
                data.append(gaze.gaze(image, results.multi_face_landmarks[0]))

    Initialized_direaction[direaction] = dp.average(data)


def gaze_tracking_main():

    global Focus
    global Focus_flow

    x_edge_left  = (Initialized_direaction[1][0] + Initialized_direaction[3][0])/2
    x_edge_right = (Initialized_direaction[2][0] + Initialized_direaction[4][0])/2
    y_edge_up    = (Initialized_direaction[1][1] + Initialized_direaction[2][1])/2
    y_edge_down  = (Initialized_direaction[3][1] + Initialized_direaction[4][1])/2

    print(x_edge_left, x_edge_right, y_edge_down, y_edge_up)

    def Out_of_screen_judger(current_direction):
        if current_direction[0] < x_edge_left or current_direction[0] > x_edge_right:
            return False
        if current_direction[1] < y_edge_down or current_direction[1] > y_edge_up:
            return False
        return True

    webcam_checker()
    data = SlidingWindow()

    with mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5) as face_mesh:
        start_time = time.time()
        One_second_total = 0
        One_second_OFS =  0
        Flag = 0
        Flag_maxm = 30
        while cap.isOpened() and Continue_state:
            success, image = cap.read()
            if not success:
                print("Ignoring empty camera frame.")
                continue
            image.flags.writeable = False
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(image)
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

            if results.multi_face_landmarks:
                data.append(gaze.gaze(image, results.multi_face_landmarks[0]))
            if not Out_of_screen_judger(data.mean()):
                One_second_OFS += 1
            One_second_total += 1
            if time.time() - start_time > 1:
                if One_second_OFS/One_second_total >= 0.9:
                    Flag += 1
                else:
                    Flag -= 1
                # print(One_second_total, One_second_OFS, end='    ')
                # print(data.mean())
                One_second_total = One_second_OFS = 0
                start_time = time.time()

                if Flag >= Flag_maxm:  #判定为不专心
                    Flag = Flag_maxm
                    Focus = False
                if Flag < 0:
                    Flag = 0
                    Focus = True
                Focus_flow.append(Focus)
                # print(Flag)
                
            # cv2.imshow('output window', image)
            # if cv2.waitKey(2) & 0xFF == 27:
            #     break
    cap.release()

# gaze_tracking_initialization(0)
# print(Initialized_direaction[0])

#gaze_tracking_main()

'''
[ 0.41546411 -0.0167751   0.908767  ] up-right
 [0.08045471 0.00443549 0.9962087 ]   up-left
'''

