"""Independent minimizers: integrate alpha cuts, then solve the gradient with SciPy."""
import json
import math
from pathlib import Path
import numpy as np
from scipy.integrate import quad
from scipy.optimize import root

centers = np.array([[0., 0.], [10., 0.], [3., 8.]])
weights = [1., 1.1, .9]
cases = []
for p in [1, 1.5, 2, 3, 4, 8]:
    for a2 in [2, 6]:
        scales = [1., a2, 3.]

        def integral(d, a, power):
            return quad(lambda alpha: (d + a * (1-alpha))**power,
                        0, 1, epsabs=1e-11, epsrel=2e-12)[0]

        def gradient(x):
            g = np.zeros(2)
            for c, a, beta in zip(centers, scales, weights):
                d = np.linalg.norm(x-c)
                D = integral(d, a, p)**(1/p)
                g += beta * integral(d, a, p-1) / D**(p-1) * (x-c)/d
            return g

        result = root(gradient, [4., 2.], tol=1e-11)
        assert np.linalg.norm(gradient(result.x)) < 1e-12, result.message
        F = sum(beta * integral(np.linalg.norm(result.x-c), a, p)**(1/p)
                for c, a, beta in zip(centers, scales, weights))
        cases.append(dict(p=p, a2=a2, x=result.x.tolist(), F=F))
Path(__file__).with_name('sensitivity-reference.json').write_text(json.dumps(cases, indent=2))
print('Independent quadrature / SciPy minimizers:', len(cases))
