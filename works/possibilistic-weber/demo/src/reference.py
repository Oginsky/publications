import json,math
from pathlib import Path
from scipy.integrate import quad
cases=[]
def integral(kind,d,a,s,core,q):
    if s==0:return 1.
    if kind=='triangle':return quad(lambda t:(d+a*t)**s,0,1,epsabs=1e-11,epsrel=2e-11)[0]
    if kind=='trapezoid':return quad(lambda t:(d+a*(core+(1-core)*t))**s,0,1,epsabs=1e-11,epsrel=2e-11)[0]
    if kind=='parabola':return quad(lambda t:(d+a*t)**s*2*t,0,1,epsabs=1e-11,epsrel=2e-11)[0]
    if kind=='cosine':return quad(lambda t:(d+a*t)**s*math.pi/2*math.sin(math.pi*t),0,1,epsabs=1e-11,epsrel=2e-11)[0]
    if kind=='gaussian':return quad(lambda u:(d+a*u)**s*u*math.exp(-u*u/2),0,40,epsabs=1e-10,epsrel=2e-11)[0]
    if kind=='exponential':return quad(lambda u:(d+a*u)**s*math.exp(-u),0,200,epsabs=1e-10,epsrel=2e-11)[0]
    if kind=='ball':return (d+a)**s
    # Log radius on each half; the positive tail is integrated analytically.
    T=max(40,48/q)
    def f(t):
        logR=math.log(d+a*math.exp(t))
        return math.exp(s*logR+math.log(q)-abs(q*t)-2*math.log1p(math.exp(-abs(q*t))))
    value=quad(f,-T,0,epsabs=1e-10,epsrel=2e-11)[0]+quad(f,0,T,epsabs=1e-10,epsrel=2e-11)[0]
    return value+q*a**s*math.exp(-(q-s)*T)/(q-s)
for kind in ['triangle','trapezoid','gaussian','exponential','parabola','cosine','bell','ball']:
    for p in [1,1.25,1.8,2,2.5,3.7,4]:
        for d in [0,1.3,10.31]:
            a,core,q=2.4,.37,5
            I=integral(kind,d,a,p,core,q);D=I**(1/p);der=integral(kind,d,a,p-1,core,q)/D**(p-1)
            cases.append(dict(kind=kind,d=d,a=a,p=p,core=core,q=q,D=D,derivative=der))
for q,p in [(1.5,1.49),(4,3.99),(2,1.999)]:
    for d in [0,3,30]:
        I=integral('bell',d,1.2,p,.35,q);D=I**(1/p)
        cases.append(dict(kind='bell',d=d,a=1.2,p=p,core=.35,q=q,D=D,derivative=integral('bell',d,1.2,p-1,.35,q)/D**(p-1)))
with Path(__file__).with_name('reference.json').open('w',encoding='utf8') as f:json.dump(cases,f)
print('Independent SciPy references:',len(cases))
