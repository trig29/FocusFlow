import numpy as np

def average(row_data):
    filtered_data = [row for row in row_data if (row is not None and len(row) == 3)]
    data = np.vstack(filtered_data)
    x, y, z = data[:, 0], data[:, 1], data[:, 2]
    ans = np.array([np.mean(x), np.mean(y), np.mean(z)])
    return ans
    pass

