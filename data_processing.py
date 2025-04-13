import numpy as np

def average(row_data):
    data = np.vstack(row_data)
    x, y, z = data[:, 0], data[:, 1], data[:, 2]
    ans = np.array([np.mean(x), np.mean(y), np.mean(z)])
    return ans
    pass

