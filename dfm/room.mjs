// Calibration and tile coordinates from the DFM LAN map, in UE centimeters.
const tileBase='https://game.gtimg.cn/images/dfm/cp/a20240729directory/img/';
const maps=[
  [357100,-770800,81086.304688,80988.5,358155.6875,750191.75,0,'map_db'],
  [328800,-640600,112800,112800,330551.75,639913.875,1,'map_yc'],
  [668200,-452923,65442.871094,65442.871094,669337,446449.75,0,'map_htjd'],
  [378400,-449400,60000,60000,380000,456000,0,'map_bks2'],
  [53150,-52650,36596.421875,36596.421875,50383.464844,51155.902344,0,'map_cxjy'],
  [null,null,80999.179688,80831.398438,197518.90625,204814.046875,-1,'map_az3']
];
export function projectEnemy(index,x,y,origin) {
  const [ox,oy,width,height,cx,cy,rotation]=maps[index];
  if (ox===null && !origin) return null;
  const u=(cx-x-(ox??origin[0]))*128/width, v=(cy+y+(oy??origin[1]))*128/height;
  if (rotation===-1) return [-128-u,128+v];
  if (rotation===1) return [-128+u,128-v];
  return [-128-v,128-u];
}
const defaultDisplay={sAR:true,sH:true,sHP:true,sTN:true};
const tierColors=['#fff','#fff','#00ff00','#64ffff','#ff64ff','#ffff64','#ff0000'];
// Project a UE yaw through the same calibrated axes as a position. Leaflet
// screen Y increases downwards, including on the two rotated maps.
export function facingAngle(index,yaw) {
  if (!Number.isFinite(yaw)) return null;
  const radians=yaw*Math.PI/180;
  const base=projectEnemy(index,0,0,[0,0]);
  const tip=projectEnemy(index,100*Math.cos(radians),100*Math.sin(radians),[0,0]);
  return Math.atan2(base[0]-tip[0],tip[1]-base[1]);
}
export function drawFacingLight(ctx,x,y,angle,radius) {
  if (angle===null) return;
  const half=0.70, segments=14, distance=radius+50, start=angle-half, step=2*half/segments;
  const edge=a=>[x+distance*Math.cos(a),y+distance*Math.sin(a)];
  let [px,py]=edge(start);
  for (let i=0;i<segments;++i) {
    const [nx,ny]=edge(start+(i+1)*step);
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(px,py);ctx.lineTo(nx,ny);ctx.closePath();
    ctx.fillStyle='rgba(220,220,220,'+(40+10*Math.abs(i-segments/2))/255+')';ctx.fill();px=nx;py=ny;
  }
  ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(...edge(start));ctx.lineTo(x,y);ctx.lineTo(px,py);
  ctx.strokeStyle='rgba(210,210,210,.51)';ctx.stroke();
  ctx.beginPath();ctx.moveTo(...edge(start));
  for(let i=1;i<=segments;++i)ctx.lineTo(...edge(start+i*step));
  ctx.strokeStyle='rgba(210,210,210,.39)';ctx.stroke();
}
function drawSquad(ctx,x,y,slot,selected) {
  ctx.beginPath();ctx.arc(x,y,10,0,2*Math.PI);
  ctx.fillStyle=slot===0?'#42ed99':'#65d9c1';ctx.fill();
  ctx.lineWidth=2;ctx.strokeStyle='#102b26';ctx.stroke();
  if(selected){ctx.beginPath();ctx.arc(x,y,13,0,2*Math.PI);ctx.strokeStyle='#f5fff9';ctx.stroke();}
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 10px system-ui,sans-serif';
  ctx.fillStyle='#09241b';ctx.fillText(slot===0?'我':'友'+slot,x,y);
}
export function drawEnemy(ctx,x,y,hp,team,operator,helmet,armor,display=defaultDisplay) {
  const circle=(r,start=-Math.PI/2,end=Math.PI*1.5)=>{ctx.beginPath();ctx.arc(x,y,r,start,end);};
  circle(11);ctx.fillStyle='#ff0000';ctx.fill();ctx.strokeStyle='#100c0c';ctx.lineWidth=2;ctx.stroke();
  if (display.sHP && hp!=null) {
    circle(15);ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=3;ctx.stroke();
    if (hp>0) {
      circle(15,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(100,hp)/100);
      ctx.strokeStyle=hp>60?'#00ff00':hp>30?'#ffff00':'#ff0000';ctx.stroke();
    }
  }
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  const label=(value,atX,atY,color)=>{
    ctx.lineWidth=3;ctx.strokeStyle='#151b17';ctx.fillStyle=color;
    ctx.strokeText(value,atX,atY);ctx.fillText(value,atX,atY);
  };
  ctx.font='bold 11px system-ui, sans-serif';
  if (display.sTN) label(String(team),x,y,'#fff');
  ctx.font='bold 12px system-ui, sans-serif';
  let top=y-23;
  if (display.sH) {label(operator||'未知干员',x,top,'#ffff64');top-=15;}
  if (display.sAR) {
    const head='头'+(helmet??'—'),vest='甲'+(armor??'—');
    const headW=ctx.measureText(head).width, vestW=ctx.measureText(vest).width, gap=8;
    label(head,x-(vestW+gap)/2,top,tierColors[helmet]||'#c3caca');
    label(vest,x+(headW+gap)/2,top,tierColors[armor]||'#c3caca');
  }
}
function openRoom() {
  const room=RadarPages.room;
  document.getElementById('room-code').textContent=room;
  const count=document.getElementById('viewers'), feed=document.getElementById('status'), dot=document.getElementById('dot');
  const select=document.getElementById('mapSel'), tileStatus=document.getElementById('tile-status');
  const viewSelect=document.getElementById('viewSel');
  const menu=document.getElementById('sideMenu'), menuButton=document.getElementById('menuBtn');
  const closeButton=menu.querySelector('.panel-close'), display={...defaultDisplay};
  function showMenu(open) {
    menu.classList.toggle('open',open);menuButton.classList.toggle('open',open);
    menu.inert=!open;menu.setAttribute('aria-hidden',String(!open));menuButton.setAttribute('aria-expanded',String(open));
    (open?closeButton:menuButton).focus();
  }
  menuButton.addEventListener('click',()=>showMenu(true));
  closeButton.addEventListener('click',()=>showMenu(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && !menu.inert)showMenu(false);});
  if (!window.L) {feed.textContent='地图组件加载失败，请刷新页面';return;}
  const map=L.map('map',{crs:L.CRS.Simple,minZoom:3,maxZoom:8,zoomControl:false,
    attributionControl:false,zoomAnimation:false}).setView([-128,128],3);
  L.control.zoom({position:'topright'}).addTo(map);
  const pane=map.createPane('enemies');pane.style.zIndex='450';pane.style.pointerEvents='none';
  const canvas=document.createElement('canvas');pane.appendChild(canvas);
  const ctx=canvas.getContext('2d');
  let index=0, layer, frame=null, lastFrame=0, dirty=false;
  let selected='free',selectedLabel='',choices='';
  const viewName=slot=>slot===0?'自己':'队友 '+slot;
  function updateViews() {
    const views=(frame?.v||[]).slice().sort((a,b)=>a[1]-b[1]);
    const list=[['free','自由看图'],...views.map(v=>[String(v[0]),viewName(v[1])])];
    if(selected!=='free' && !list.some(([key])=>key===selected))
      list.push([selected,selectedLabel+' · 暂无位置']);
    const signature=JSON.stringify(list);
    if(signature!==choices){
      const options=list.map(([key,label])=>new Option(label,key));
      viewSelect.replaceChildren(...options);choices=signature;
    }
    if(viewSelect.value!==selected)viewSelect.value=selected;
  }
  function follow() {
    if(selected==='free')return;
    const target=frame?.v?.find(v=>String(v[0])===selected);
    if(!target)return;
    const pos=projectEnemy(index,target[2],target[3],frame.o);
    if(!pos)return;
    const center=map.latLngToContainerPoint(pos),size=map.getSize();
    if(Math.abs(center.x-size.x/2)>1 || Math.abs(center.y-size.y/2)>1)map.panTo(pos,{animate:false});
  }
  viewSelect.addEventListener('change',()=>{
    selected=viewSelect.value;
    const v=frame?.v?.find(v=>String(v[0])===selected);
    if(v)selectedLabel=viewName(v[1]);
    updateViews();follow();scheduleDraw();
  });
  map.on('dragstart',()=>{selected='free';selectedLabel='';updateViews();scheduleDraw();});
  function redraw() {
    dirty=false;
    const size=map.getSize(), top=map.containerPointToLayerPoint([0,0]), ratio=window.devicePixelRatio||1;
    L.DomUtil.setPosition(canvas,top);
    canvas.style.width=size.x+'px';canvas.style.height=size.y+'px';
    const width=Math.round(size.x*ratio),height=Math.round(size.y*ratio);
    if (canvas.width!==width || canvas.height!==height) {canvas.width=width;canvas.height=height;}
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,size.x,size.y);
    if (!frame) return;
    const point=(x,y)=>{
      const pos=projectEnemy(index,x,y,frame.o);
      if (!pos) return null;
      const pt=map.latLngToContainerPoint(pos);
      return pt.x>=-100 && pt.y>=-80 && pt.x<=size.x+100 && pt.y<=size.y+80 ? pt : null;
    };
    // Paint every light below every marker so overlapping beams never cover a team number.
    const enemies=[],allies=[];
    for(const e of frame.e){
      const pt=point(e[0],e[1]);if(!pt)continue;
      drawFacingLight(ctx,pt.x,pt.y,facingAngle(index,e[7]),11);enemies.push([pt,e]);
    }
    for(const v of frame.v||[]){
      const pt=point(v[2],v[3]);if(!pt)continue;
      drawFacingLight(ctx,pt.x,pt.y,facingAngle(index,v[4]),10);allies.push([pt,v]);
    }
    for(const [pt,e] of enemies)drawEnemy(ctx,pt.x,pt.y,e[2],e[3],e[4],e[5],e[6],display);
    for(const [pt,v] of allies)drawSquad(ctx,pt.x,pt.y,v[1],String(v[0])===selected);
  }
  function scheduleDraw() {if (!dirty) {dirty=true;requestAnimationFrame(redraw);}}
  for (const button of menu.querySelectorAll('[data-setting]')) {
    const key=button.dataset.setting;
    button.addEventListener('click',()=>{
      display[key]=!display[key];
      button.setAttribute('aria-checked',String(display[key]));
      button.querySelector('.sw-track').classList.toggle('on',display[key]);
      scheduleDraw();
    });
  }
  function setMap() {
    if (layer) layer.remove();
    index=select.selectedIndex;
    tileStatus.hidden=true;
    layer=L.tileLayer(tileBase+maps[index][7]+'/{z}_{x}_{y}.jpg',{
      minZoom:3,maxZoom:8,maxNativeZoom:4,tileSize:256,noWrap:true,bounds:[[-256,0],[0,256]]
    }).addTo(map);
    layer.on('tileerror',()=>{tileStatus.hidden=false;});
    map.setView([-128,128],3,{animate:false});
    follow();scheduleDraw();
  }
  select.addEventListener('change',setMap);
  map.on('move zoom resize viewreset',scheduleDraw);setMap();
  function status(text,live=false) {feed.textContent=text;dot.className='hud-dot '+(live?'on':'wait');}
  function clear(text) {frame=null;lastFrame=0;updateViews();status(text);scheduleDraw();}
  const stream=new RadarPages.Stream('/dfm/'+room+'/events');
  stream.addEventListener('frame',ev=>{
    let next;
    try {next=JSON.parse(ev.data);} catch {clear('等待有效数据');return;}
    if (!next?.active || !Array.isArray(next.e)) {clear('等待对局数据');return;}
    frame=next;lastFrame=performance.now();updateViews();follow();
    status(next.e.length?'实时 · '+next.e.length+' 名敌人':'实时 · 暂无敌人',true);
    scheduleDraw();
  });
  stream.addEventListener('viewers',ev=>{
    const n=Number(ev.data);
    count.textContent=(Number.isInteger(n)&&n>=0?n:'—')+' 人在线';
  });
  stream.addEventListener('ended',()=>{stream.close();location.replace('./?ended=1&room='+room);});
  stream.onerror=()=>{
    count.textContent='— 人在线';
    clear(stream.readyState===EventSource.CLOSED?'房间已关闭，请返回入口重新加入':'连接中断，正在重连…');
  };
  setInterval(()=>{if(frame && performance.now()-lastFrame>2200)clear('等待对局数据');},250);
  window.addEventListener('pagehide',()=>stream.close(),{once:true});
  window.addEventListener('pageshow',ev=>{if(ev.persisted)location.reload();});
}
if (typeof document!=='undefined') openRoom();
