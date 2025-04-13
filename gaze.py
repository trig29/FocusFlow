import cv2
import numpy as np
from helpers import relative, relativeT


def gaze(frame, points):
    image_points = np.array([
        relative(points.landmark[4], frame.shape),
        relative(points.landmark[152], frame.shape), 
        relative(points.landmark[263], frame.shape),
        relative(points.landmark[33], frame.shape),
        relative(points.landmark[287], frame.shape),
        relative(points.landmark[57], frame.shape)
    ], dtype="double")

    image_points1 = np.array([
        relativeT(points.landmark[4], frame.shape),
        relativeT(points.landmark[152], frame.shape),
        relativeT(points.landmark[263], frame.shape),
        relativeT(points.landmark[33], frame.shape),
        relativeT(points.landmark[287], frame.shape),
        relativeT(points.landmark[57], frame.shape)
    ], dtype="double")


    model_points = np.array([
        (0.0, 0.0, 0.0),
        (0, -63.6, -12.5),
        (-43.3, 32.7, -26),
        (43.3, 32.7, -26),
        (-28.9, -28.9, -24.1),
        (28.9, -28.9, -24.1)
    ])

    '''
    3D model eye points
    The center of the eye ball
    '''
    Eye_ball_center_right = np.array([[-29.05], [32.7], [-39.5]])
    Eye_ball_center_left = np.array([[29.05], [32.7], [-39.5]])

    '''
    camera matrix estimation
    '''
    focal_length = frame.shape[1]
    center = (frame.shape[1] / 2, frame.shape[0] / 2)
    camera_matrix = np.array(
        [[focal_length, 0, center[0]],
         [0, focal_length, center[1]],
         [0, 0, 1]], dtype="double"
    )

    dist_coeffs = np.zeros((4, 1))
    (success, rotation_vector, translation_vector) = cv2.solvePnP(model_points, image_points, camera_matrix,
                                                                  dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE)



    left_iris_points = [points.landmark[i] for i in [468, 469, 470, 471, 472]]
    right_iris_points = [points.landmark[i] for i in [473, 474, 475, 476, 477]]


    left_pupil = np.mean([(lmk.x * frame.shape[1], lmk.y * frame.shape[0]) 
                        for lmk in left_iris_points], axis=0)
    right_pupil = np.mean([(lmk.x * frame.shape[1], lmk.y * frame.shape[0])
                        for lmk in right_iris_points], axis=0)


    left_pupil = (int(left_pupil[0]), int(left_pupil[1]))
    right_pupil = (int(right_pupil[0]), int(right_pupil[1]))


    _, transformation, _ = cv2.estimateAffine3D(image_points1, model_points)

    if transformation is not None:

        pupil_world_cord = transformation @ np.array([[left_pupil[0], left_pupil[1], 0, 1]]).T


        S = Eye_ball_center_left + (pupil_world_cord - Eye_ball_center_left) * 10


        (eye_pupil2D, _) = cv2.projectPoints((int(S[0]), int(S[1]), int(S[2])), rotation_vector,
                                             translation_vector, camera_matrix, dist_coeffs)

        (head_pose, _) = cv2.projectPoints((int(pupil_world_cord[0]), int(pupil_world_cord[1]), int(40)),
                                           rotation_vector,
                                           translation_vector, camera_matrix, dist_coeffs)

        gaze = left_pupil + (eye_pupil2D[0][0] - left_pupil) - (head_pose[0][0] - left_pupil)


        p1 = (int(left_pupil[0]), int(left_pupil[1]))
        p2 = (int(gaze[0]), int(gaze[1]))
        #cv2.line(frame, p1, p2, (0, 0, 255), 2)

        G = S - Eye_ball_center_left
        Gaze_vector = G / np.linalg.norm(G)
        return Gaze_vector.flatten()