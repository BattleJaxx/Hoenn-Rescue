"""Convert a pokeemerald-expansion follower sprite to a transparent PNG.

Usage: python3 tools/convert_follower.py <overworld.png> <overworld_normal.pal> <out.png>
Palette index 0 becomes transparent.
"""
import sys
from PIL import Image
src, pal, out = sys.argv[1:4]
lines=open(pal).read().split()
n=int(lines[2]); cols=[tuple(map(int,lines[3+i*3:6+i*3])) for i in range(n)]
im=Image.open(src); px=im.load(); w,h=im.size
o=Image.new('RGBA',(w,h))
op=o.load()
for y in range(h):
  for x in range(w):
    i=px[x,y]; op[x,y]=(0,0,0,0) if i==0 else cols[i]+(255,)
o.save(out)
