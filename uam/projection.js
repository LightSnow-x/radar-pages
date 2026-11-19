'use strict';
globalThis.UamMapProjection = Object.freeze({
  valid(p) {
    return p?.kind === 'uam-native-uv' && ['xx','xy','yx','yy','offsetX','offsetY'].every(k => Number.isFinite(p[k])) &&
      Math.abs(p.xx*p.yy-p.xy*p.yx) > 1e-16;
  },
  project(p,x,y) {
    if (!this.valid(p) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {u:p.xx*x+p.xy*y+p.offsetX,v:p.yx*x+p.yy*y+p.offsetY};
  },
  unproject(p,u,v) {
    if (!this.valid(p) || !Number.isFinite(u) || !Number.isFinite(v)) return null;
    const determinant=p.xx*p.yy-p.xy*p.yx,dx=u-p.offsetX,dy=v-p.offsetY;
    return {x:(dx*p.yy-dy*p.xy)/determinant,y:(dy*p.xx-dx*p.yx)/determinant};
  },
  direction(p,x,y,width,height) {
    if(!this.valid(p)||![x,y,width,height].every(Number.isFinite)||width<=0||height<=0)return null;
    const dx=(p.xx*x+p.xy*y)*width,dy=(p.yx*x+p.yy*y)*height,length=Math.hypot(dx,dy);
    return Number.isFinite(length)&&length>1e-12?Math.atan2(dy,dx):null;
  }
});
