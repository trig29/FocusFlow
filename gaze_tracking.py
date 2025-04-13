import mediapipe as mp
import cv2
import gaze
import time
import numpy as np
import data_processing as dp
from collections import deque

#Concentrated or Not Bool Value:
Focus = True


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

Initialized_direaction = [None, None, None, None, None]

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
        while cap.isOpened():
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
                print(One_second_total, One_second_OFS, end='    ')
                print(data.mean())
                One_second_total = One_second_OFS = 0
                start_time = time.time()

                if Flag >= Flag_maxm:  #判定为不专心
                    Flag = Flag_maxm
                    Focus = False
                if Flag < 0:
                    Flag = 0
                    Focus = True
                print(Flag)
                
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

