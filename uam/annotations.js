'use strict';
globalThis.UamMapAnnotations=Object.freeze({
  prepare(points) {
    if(!Array.isArray(points))return [];
    const grouped=new Map();
    for(const point of points) {
      if(!point||!['place','exit'].includes(point.kind)||typeof point.name!=='string'||!point.name.trim()||
        !Number.isFinite(point.x)||!Number.isFinite(point.y))continue;
      const key=[point.kind,point.name,Math.round(point.x),Math.round(point.y)].join('|');
      const areas=Array.isArray(point.areas)?point.areas.filter(Number.isInteger):[];
      const condition=typeof point.condition==='string'?point.condition:'';
      const description=typeof point.description==='string'?point.description:'';
      const previous=grouped.get(key);
      if(previous) {
        previous.areas=[...new Set([...previous.areas,...areas])];
        if(condition&&!previous.conditions.includes(condition))previous.conditions.push(condition);
        if(description&&!previous.descriptions.includes(description))previous.descriptions.push(description);
        previous.minScale=Math.min(previous.minScale,Number.isFinite(point.minScale)?point.minScale:1);
        previous.maxScale=Math.max(previous.maxScale,Number.isFinite(point.maxScale)?point.maxScale:100);
      } else grouped.set(key,{...point,id:key,areas,conditions:condition?[condition]:[],descriptions:description?[description]:[],
        minScale:Number.isFinite(point.minScale)?point.minScale:1,maxScale:Number.isFinite(point.maxScale)?point.maxScale:100,
        priority:Number.isFinite(point.priority)?point.priority:0,textScale:Number.isFinite(point.textScale)?point.textScale:1});
    }
    return [...grouped.values()].map(point=>{
      const explicit=point.areas.filter(id=>id>=0);
      return {...point,areas:explicit.length?explicit:point.areas};
    });
  },
  visible(points,floor,scale,{names=true,exits=true}={}) {
    return points.filter(point=> {
      if(point.kind==='exit')return exits;
      if(!names)return false;
      const area=Number(floor.id);
      if(!floor.overview&&point.areas.length&&!point.areas.includes(-1)&&!point.areas.includes(area))return false;
      // Preserve the most detailed label tier beyond the game's usual maximum zoom.
      const lod=Math.max(1,Math.min(scale,6));
      return point.minScale<=lod+.01&&point.maxScale>=lod-.01;
    }).sort((a,b)=>Number(b.kind==='exit')-Number(a.kind==='exit')||b.priority-a.priority||b.textScale-a.textScale);
  },
  plainText(value) {
    return String(value||'').replace(/<[^>]*>/g,'').replace(/\{Progress\}/g,'')
      .replace(/\{Total\}个/g,'指定数量的').replace(/\{Total\}/g,'指定数量')
      .replace(/\{[^}]+\}/g,'（以本局为准）').trim();
  }
});
