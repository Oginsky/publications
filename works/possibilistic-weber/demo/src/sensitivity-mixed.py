"""Independent optimization of the initial five-profile scene, directly over alpha."""
import json
import math
from pathlib import Path
import numpy as np
from scipy.integrate import quad
from scipy.optimize import root

centers = np.array([[0., 0.], [8., 1.], [3., 7.], [-3., 6.], [10., 7.]])
weights = [1., 1.2, .9, .8, 1.]
initial = [2., 2.4, 2.7, 1.4, 1.8]

def radius(alpha, a, j):
    return a * [lambda: math.sqrt(-2*math.log(alpha)),
                lambda: .4+.6*(1-alpha),
                lambda: math.acos(2*alpha-1)/math.pi,
                lambda: -math.log(alpha),
                lambda: (1/alpha-1)**.2][j]()

def integral(d, a, j, power):
    # alpha = u^5 removes the bell profile's integrable singularity at zero.
    return quad(lambda u: (d+radius(u**5, a, j))**power * 5*u**4,
                0, 1, epsabs=2e-10, epsrel=2e-11, limit=300)[0]

cases = []
for p in [2, 4]:
    for changed in [None, 1, 2, 3, 4, 5]:
        scales = initial.copy()
        if changed is not None:
            scales[changed-1] = 10.

        def gradient(x):
            g = np.zeros(2)
            for j, (c, a, beta) in enumerate(zip(centers, scales, weights)):
                d = np.linalg.norm(x-c)
                D = integral(d, a, j, p)**(1/p)
                g += beta*integral(d, a, j, p-1)/D**(p-1)*(x-c)/d
            return g

        result = root(gradient, [4., 4.], tol=1e-10)
        assert np.linalg.norm(gradient(result.x)) < 1e-10, result.message
        cases.append(dict(p=p, changed=changed, x=result.x.tolist()))
Path(__file__).with_name('sensitivity-mixed.json').write_text(json.dumps(cases, indent=2))
print('Independent five-profile minimizers:', len(cases))
