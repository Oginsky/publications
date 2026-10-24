import json,math
import numpy as np
from scipy.integrate import quad
from scipy.optimize import minimize_scalar,minimize
from pathlib import Path

def far(x,r,k,shape):
 if shape=='circle':return math.hypot(*x)+r
 if shape=='rectangle':return math.hypot(abs(x[0])+r,abs(x[1])+r*k)
 if r==0:return math.hypot(*x)
 def f(t):return (x[0]-r*math.cos(t))**2+(x[1]-r*k*math.sin(t))**2
 angles=np.linspace(0,2*math.pi,97)[:-1];vals=[f(t) for t in angles];maxima=[]
 for i,t in enumerate(angles):
  if vals[i]>=vals[i-1] and vals[i]>=vals[(i+1)%len(vals)]:
   h=2*math.pi/96;v=minimize_scalar(lambda a:-f(a),bounds=(t-h,t+h),method='bounded',options={'xatol':1e-13});maxima.append(-v.fun)
 return math.sqrt(max(maxima))

def value(o,x,p):
 angle=math.radians(o['angle']);dx=x[0]-o['x'];dy=x[1]-o['y'];u=(math.cos(angle)*dx+math.sin(angle)*dy,-math.sin(angle)*dx+math.cos(angle)*dy);a=o['a'];k=1 if o['shape']=='circle' else o['aspect'];shape=o['shape'];kind=o['type']
 if p=='Infinity':return far(u,a,k,shape)
 if kind=='ball':return far(u,a,k,shape)
 def R(t):return far(u,a*t,k,shape)**p
 if kind=='triangle':I=quad(R,0,1,epsabs=1e-8,epsrel=2e-10,limit=250)[0]
 elif kind=='gaussian':I=quad(lambda t:R(t)*t*math.exp(-t*t/2),0,40,epsabs=1e-8,epsrel=2e-10,limit=250)[0]
 elif kind=='exponential':I=quad(lambda t:R(t)*math.exp(-t),0,300,epsabs=1e-8,epsrel=2e-10,limit=250)[0]
 elif kind=='bell':
  q=o['q'];I=quad(lambda t:R(t)*q*t**(q-1)/(1+t**q)**2,0,np.inf,epsabs=1e-7,epsrel=2e-9,limit=250)[0]
 return I**(1/p)

base=dict(id=1,x=1,y=-2,a=2,b=1,type='gaussian',core=.35,q=5,shape='ellipse',aspect=2.7,angle=31)
cases=[]
for shape in ['ellipse','rectangle']:
 for kind,p in [('triangle',1),('triangle',2.7),('gaussian',2),('gaussian',64),('exponential',3.2),('bell',2.3),('ball','Infinity')]:
  o=dict(base,shape=shape,type=kind);x=[4.1,3.2];cases.append(dict(o=o,x=x,p=p,D=value(o,x,p)))
for x in [[1,-2],[1.5,-2]]:
 o=dict(base,angle=0,aspect=3,type='triangle');cases.append(dict(o=o,x=x,p=2,D=value(o,x,2)))
Path(__file__).with_name('nonradial-reference.json').write_text(json.dumps(cases),encoding='utf-8')
print('Independent SciPy reference distances:',len(cases),flush=True)

objects=[base,dict(base,id=2,x=8,y=1,shape='rectangle',type='triangle',angle=-20,aspect=.4),dict(base,id=3,x=-3,y=6,shape='circle',type='triangle')]
solutions=[]
for p in [1,2,2.5]:
 def F(x):return sum(o['b']*value(o,x,p) for o in objects)
 a=math.radians(base['angle']);axis=np.array([math.cos(a),math.sin(a)]);center=np.array([base['x'],base['y']]);line=minimize_scalar(lambda t:F(center+t*axis),bounds=(-10,20),method='bounded',options={'xatol':2e-9});r=minimize(F,center+line.x*axis,method='Nelder-Mead',options={'xatol':2e-8,'fatol':2e-9,'maxiter':400})
 solutions.append(dict(objects=objects,p=p,x=r.x.tolist(),F=r.fun));print('Independent optimum',p,r.x,r.fun,r.success,flush=True)
Path(__file__).with_name('nonradial-optima.json').write_text(json.dumps(solutions),encoding='utf-8')
