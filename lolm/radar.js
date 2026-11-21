'use strict';
import { createRadarUi } from './radar-ui.js?v=2ca97a8c86db';
import { heroPortraitUrl, mapImageUrl, localIconUrl, unitIconSize, unitHasHealthBar, drawLocalIcon } from './radar-unit-icons.js?v=2ca97a8c86db';
import { selectVisibleUnits } from './radar-unit-layers.js?v=2ca97a8c86db';
import { createImageCache } from './radar-image-cache.js?v=2ca97a8c86db';
(() => {
  const ui = createRadarUi();
  const settings = ui.settings;
  const shared = globalThis.RadarPages;
  const byId=id=>document.getElementById(id),canvas=byId('radar'),ctx=canvas.getContext('2d'),stage=byId('mapStage');
  let frame=null,previous=null,receivedAt=0,previousAt=0,lastSequence=null,lastGeneration=null,lastAdvance=0,size=512,hits=[];
  const imageCache=createImageCache();
  const image=url=>imageCache.get(url);
  function prepareImages(data) {
    if(settings.portraits)for(const hero of data.heroes)image(heroPortraitUrl(hero.id,data));
    if(shared) return;
    for(const unit of selectVisibleUnits(data.units,settings.unitTypes)) {
      image(localIconUrl(unit.fallbackIcon,data));
      image(localIconUrl(unit.icon,data));
    }
    if(settings.jungle)for(const monster of data.monsters)if(!monster.dead)image(localIconUrl(monster.icon,data));
  }
  function resize(){const rect=stage.getBoundingClientRect();size=Math.max(1,rect.width);const ratio=Math.min(devicePixelRatio||1,3);canvas.width=Math.round(size*ratio);canvas.height=Math.round(size*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';}
  new ResizeObserver(resize).observe(stage);resize();
  function status(text,live){const node=byId('status');if(node.textContent!==text)node.textContent=text;byId('statusDot').classList.toggle('live',live);}
  function empty(title,detail){byId('emptyState').hidden=false;byId('emptyState').querySelector('strong').textContent=title;byId('emptyState').querySelector('p').textContent=detail;}
  function campColor(camp){return camp===frame.localCamp?'#61bdff':camp===frame.blueCamp||camp===frame.redCamp?'#ff7182':'#e6b868';}
  function uv(item,group){if(!Array.isArray(item.uv)||item.uv.length!==2||!item.uv.every(Number.isFinite))return null;let [u,v]=item.uv;if(u<0||u>1||v<0||v>1)return null;const old=previous&&previous[group]&&previous[group].find(x=>x.objectId===item.objectId&&x.id===item.id);if(old&&item.objectId&&Array.isArray(old.uv)&&old.uv.every(Number.isFinite)&&Math.hypot(u-old.uv[0],v-old.uv[1])<.15){const t=Math.max(0,Math.min(1,(performance.now()-receivedAt)/Math.max(50,receivedAt-previousAt)));u=old.uv[0]+(u-old.uv[0])*t;v=old.uv[1]+(v-old.uv[1])*t;}if(!settings.teamView&&frame.map.rotate180){u=1-u;v=1-v;}return[u*size,v*size];}
  function label(text,x,y,color='#ebf4f8',font=10){ctx.font=`600 ${font}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=3;ctx.strokeStyle='#07121dee';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);}
  function bar(item,x,y,width){if(!settings.health||!(item.maxHp>0)||item.hp===null)return;const ratio=Math.max(0,Math.min(1,item.hp/item.maxHp));ctx.fillStyle='#05131ddd';ctx.fillRect(x-width/2-1,y-1,width+2,5);ctx.fillStyle=ratio>.5?'#76dbaa':ratio>.2?'#ebc36a':'#ff7182';ctx.fillRect(x-width/2,y,width*ratio,3);}
  const poiNames={2:'小龙',3:'男爵',4:'先锋',5:'蓝 BUFF',6:'红 BUFF',7:'三狼',8:'石甲虫',9:'锋喙鸟',10:'魔沼蛙',11:'河蟹',13:'先锋',14:'先锋',15:'男爵'};
  function neutral(item,x,y,r){const route=localIconUrl(item.icon,frame),art=route?image(route):null;if(art){drawLocalIcon(ctx,art,x-r,y-r,2*r,2*r,route);}else{ctx.beginPath();ctx.moveTo(x,y-r*.7);ctx.lineTo(x+r*.7,y);ctx.lineTo(x,y+r*.7);ctx.lineTo(x-r*.7,y);ctx.closePath();ctx.fillStyle='#e3b969';ctx.fill();ctx.strokeStyle='#392716';ctx.lineWidth=1.5;ctx.stroke();}}
  function drawUnits() {
    for (const unit of selectVisibleUnits(frame.units,settings.unitTypes)) {
      const p = uv(unit, 'units');
      if (!p) continue;
      const [x, y] = p;
      if (unit.markerKind === 'point') {
        const radius = 2.3 * settings.markerScale;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#73dc59'; ctx.fill();
        ctx.strokeStyle = '#17351d'; ctx.lineWidth = .8; ctx.stroke();
        hits.push({x,y,r:8,item:unit,type:unit.typeLabel || '掉落物'});
        continue;
      }
      let url = localIconUrl(unit.icon, frame);
      let icon = image(url);
      if (!icon) { url=localIconUrl(unit.fallbackIcon,frame); icon=image(url); }
      const dimensions = icon ? unitIconSize(icon, settings.markerScale, unit) : null;
      if (dimensions) {
        drawLocalIcon(ctx,icon,x-dimensions.width/2,y-dimensions.height/2,dimensions.width,dimensions.height,url);
        if (unitHasHealthBar(unit)) bar(unit, x, y + dimensions.height / 2 + 3, dimensions.width);
        hits.push({ x, y, r: Math.max(8, dimensions.width / 2, dimensions.height / 2), item: unit, type: unit.typeLabel || '单位' });
        continue;
      }
      // Loading/missing pictures do not manufacture a second geometric marker.
    }
  }
  function drawJungle(){if(!shared&&settings.jungle)for(const monster of frame.monsters){if(monster.dead||monster.small&&!settings.smallMonsters)continue;const p=uv(monster,'monsters');if(!p)continue;const[x,y]=p,r=(monster.small?4.5:9)*settings.markerScale;neutral(monster,x,y,r);bar(monster,x,y+r+3,r*2);if(settings.jungleLabels)label(poiNames[monster.poi]||`#${monster.id}`,x,y+r+12,'#dfca96',9);hits.push({x,y,r:Math.max(r,10),item:monster,type:'野怪'});}if(settings.timers)for(const timer of frame.timers){if(!(timer.seconds>0))continue;const p=uv(timer,'timers');if(!p)continue;const[x,y]=p,r=11*settings.markerScale;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='#09202be6';ctx.fill();ctx.strokeStyle='#d1ac62';ctx.lineWidth=1.2;ctx.stroke();const minutes=Math.floor(timer.seconds/60),seconds=timer.seconds%60;label(minutes?`${minutes}:${String(seconds).padStart(2,'0')}`:String(seconds),x,y,'#f3d9a2',10*settings.markerScale);if(settings.jungleLabels)label(poiNames[timer.poi]||`#${timer.id}`,x,y+r+9,'#dfca96',9);hits.push({x,y,r:Math.max(r,11),item:timer,type:'刷新计时'});}}
  function drawHeroes(){if(!settings.heroes)return;for(const hero of frame.heroes){const ally=hero.camp===frame.localCamp;if(ally&&!settings.allies||!ally&&!settings.enemies||hero.dead&&!settings.deadHeroes||!shared&&settings.visibleOnly&&!hero.visible)continue;const p=uv(hero,'heroes');if(!p)continue;const[x,y]=p,r=(hero.local?15:12)*settings.markerScale,color=hero.dead?'#7b929e':hero.local?'#91f2cb':campColor(hero.camp);ctx.save();ctx.shadowColor=color;ctx.shadowBlur=hero.local?8:3;ctx.beginPath();ctx.arc(x,y,r+1,0,Math.PI*2);ctx.fillStyle='#101d29';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=hero.local?2.5:2;ctx.stroke();ctx.shadowBlur=0;const portrait=settings.portraits?image(heroPortraitUrl(hero.id,frame)):null;if(portrait){ctx.save();ctx.beginPath();ctx.arc(x,y,r-1,0,Math.PI*2);ctx.clip();ctx.globalAlpha=hero.dead ? .4 : 1;ctx.drawImage(portrait,x-r,y-r,r*2,r*2);ctx.restore();}else label(String(hero.id).slice(-3),x,y,color,Math.max(8,r*.65));ctx.restore();bar(hero,x,y+r+4,r*2);if(settings.labels)label(`#${hero.id}`,x,y-r-9,color,10);hits.push({x,y,r:r+3,item:hero,type:'英雄'});}}
  function render(){ctx.clearRect(0,0,size,size);ctx.fillStyle='#0b1820';ctx.fillRect(0,0,size,size);hits=[];if(frame&&frame.ready){const name=frame.map.name;const art=image(mapImageUrl(name));if(art){ctx.save();if(settings.teamView&&frame.map.rotate180){ctx.translate(size,size);ctx.rotate(Math.PI);}const crop=Array.isArray(frame.map.crop)&&frame.map.crop.length===4&&frame.map.crop.every(Number.isFinite)?frame.map.crop:[0,0,1,1];ctx.drawImage(art,crop[0]*art.width,crop[1]*art.height,crop[2]*art.width,crop[3]*art.height,0,0,size,size);ctx.restore();byId('emptyState').hidden=true;}else empty(name?'地图资源加载中':'等待地图名称',name?`当前底图：${name}。未包含的底图会保留空白。`:'正在读取游戏当前的小地图纹理。');ctx.fillStyle='#07111b28';ctx.fillRect(0,0,size,size);if(shared)drawSharedLanes();else drawUnits();drawJungle();drawHeroes();if(performance.now()-lastAdvance>1500){status('对局数据已暂停',false);empty('等待对局更新','程序或游戏没有提供新的帧，旧标记已隐藏。');ctx.clearRect(0,0,size,size);hits=[];frame=null;previous=null;ui.clearFrame();}}requestAnimationFrame(render);}requestAnimationFrame(render);
  canvas.addEventListener('click',event=>{const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;const hit=[...hits].reverse().find(h=>Math.hypot(h.x-x,h.y-y)<=h.r+3);const panel=byId('inspection');if(!hit){panel.hidden=true;return;}const item=hit.item;const lines=[`${hit.type} · ID ${item.id}`,!shared&&item.objectId?`对象 ID ${item.objectId}`:item.anchorId?`营地 ID ${item.anchorId}`:'',item.roleId?`角色 ID ${item.roleId}`:'',Array.isArray(item.world)?`坐标 ${item.world.map(n=>Number(n).toFixed(2)).join(' / ')}`:'',item.hp!==undefined&&item.hp!==null?`血量 ${Math.round(item.hp)} / ${Math.round(item.maxHp)}`:'',item.seconds!==undefined&&item.seconds!==null?`刷新剩余 ${item.seconds} 秒`:'',item.skills?`技能 ID ${item.skills.map(s=>s.id).join('、')}`:''];panel.textContent=lines.filter(Boolean).join('\n');panel.hidden=false;});
  function clearFrame(message, title, detail) {
    frame = null;
    previous = null;
    status(message, false);
    empty(title, detail);
    byId('inspection').hidden = true;
    ui.clearFrame();
  }

  function drawSharedLanes() {
    if (!settings.lanes || !Array.isArray(frame.lanes)) return;
    const radius = Math.max(1.5, 2.4 * settings.markerScale);
    const scale = size / 10000;
    const rotated = !settings.teamView && frame.map.rotate180;
    for (const [camp, x, y] of frame.lanes) {
      ctx.beginPath();
      ctx.arc(rotated ? size - x * scale : x * scale, rotated ? size - y * scale : y * scale,
        radius, 0, Math.PI * 2);
      ctx.fillStyle = campColor(camp);
      ctx.fill();
    }
  }

  function acceptFrame(data) {
    if (data?.version !== 1 || typeof data.ready !== 'boolean') return false;
    if (!data.ready) {
      clearFrame('等待对局', '等待对局数据', '保持游戏和程序运行，进入对局后自动同步。');
      return true;
    }
    if (!data.map || !['heroes', 'monsters', 'timers', 'units'].every(key => Array.isArray(data[key]))) return false;
    const now = performance.now();
    if (data.sequence !== lastSequence || data.generation !== lastGeneration) {
      lastAdvance = now;
      lastSequence = data.sequence;
      lastGeneration = data.generation;
      previous = frame && frame.map.name === data.map.name && frame.generation === data.generation ? frame : null;
      previousAt = receivedAt;
      receivedAt = now;
    }
    if (now - lastAdvance > 1500) {
      clearFrame('对局数据已暂停', '等待对局更新', '暂未收到新数据，恢复后会自动同步。');
      return true;
    }
    frame = data;
    prepareImages(data);
    status('实时连接', true);
    ui.updateFrame(data);
    return true;
  }

  async function poll() {
    const started = performance.now();
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 1800);
    try {
      const response = await fetch('/api/frame', { cache: 'no-store', signal: abort.signal });
      if (!response.ok) throw new Error('HTTP');
      if (!acceptFrame(await response.json())) throw new Error('Version');
      byId('latency').textContent = Math.round(performance.now() - started) + ' ms';
    } catch {
      clearFrame('连接中断', '连接中断，正在重试', '请检查程序是否运行，并确认两台设备处于同一局域网。');
      byId('latency').textContent = '—';
    } finally {
      clearTimeout(timeout);
      setTimeout(poll, Math.max(20, settings.refresh - (performance.now() - started)));
    }
  }
  let stream;
  function startShared() {
    if (stream || document.hidden) return;
    const current = new shared.Stream(shared.route + '/events');
    stream = current;
    current.addEventListener('frame', event => {
      if (stream !== current) return;
      try { if (acceptFrame(JSON.parse(event.data))) return; } catch {}
      clearFrame('等待有效数据', '等待对局更新', '房间下一帧到达后会自动同步。');
    });
    current.addEventListener('viewers', event => {
      const count = Number(event.data);
      if (stream === current && Number.isSafeInteger(count) && count >= 0)
        byId('latency').textContent = count + ' 人观看';
    });
    current.addEventListener('error', () => {
      if (stream !== current) return;
      clearFrame('连接中断', '连接中断，正在重试', '请确认设备上的网页雷达仍在运行。');
      byId('latency').textContent = '—';
    });
    current.addEventListener('ended', () => {
      if (stream !== current) return;
      stopShared();
      location.replace('./?ended=1&room=' + encodeURIComponent(shared.room));
    });
  }
  function stopShared() {
    stream?.close();
    stream = null;
  }
  if (shared) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopShared();
      else startShared();
    });
    addEventListener('pagehide', stopShared);
    addEventListener('pageshow', startShared);
    startShared();
  } else poll();
})();
