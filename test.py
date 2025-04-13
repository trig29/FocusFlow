import gaze_tracking as gt
import time
for i in range(1,5):
    time.sleep(1)
    gt.gaze_tracking_initialization(i)

print(gt.Initialized_direaction)
print(gt.Focus)

time.sleep(5)

gt.gaze_tracking_main()