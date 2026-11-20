'use strict';
(() => {
  const byId=id=>document.getElementById(id),projection=globalThis.UamMapProjection,annotationModel=globalThis.UamMapAnnotations;
  const params=new URLSearchParams(location.search);
  const room=params.get('room')||location.pathname.match(/^\/(\d{4})\/?$/)?.[1]||'';
  const preview=params.get('preview')==='1';
  const localLive=!room&&!preview;
  let atlas,maps=[],map,selected,selectedFloor,bounds,focusBounds,generation=0,catalogGeneration=0,stream;
  let imageLayers=[],lastPacket=null,lastFrameAt=0,connectionTimer,followedMapId=0;
  let atlasRevision='',catalogRetry,catalogLoading=false,manualMapId='';
  const mapPackLoader=globalThis.UamRadarMapPack;
  let mapPack=null,mapPackRequest=null,failedPackRegion='';
  const usesMapPack=()=>mapPack&&atlas===mapPack.catalog;
  const matchesAtlas=packet=>packet.region===atlas.region||(usesMapPack()&&mapPack.supports(packet));
  let viewMode='2d',followId='self',follow2d=false,rosterKey='',rosterSession='';
  const is3d=()=>viewMode!=='2d';
  let sceneRenderer=null,sceneKey='',sceneGeneration=0,sceneAbort=null,sceneBusy=false,nextSceneFetch=0;
  let sceneTransfer=null,sceneRetry=0;
  let avatarAsset=null,avatarBusy=false,avatarRetryAt=0,avatarMessage='';
  const sceneModel=globalThis.UamRadar3D;
  const publicModelPack=globalThis.UamRadarModelPack;
  const avatarLabel=publicModelPack?'奶娃模型':'奶龙模型';
  const standingPoses=new Map();
  byId('viewControls').hidden=Boolean(room&&!publicModelPack);
  const resourceUrl=path=>room?path+'?room='+room+(atlasRevision?'&rev='+atlasRevision:''):path;
  const images=new Map(),markers=new Map();
  let annotationLayers=[],annotationBaseZoom=0,annotationsReady=false;
  const sourceLabel=preview?'预览':room?'房间 '+room:'局域网';
  document.title='暗区突围 · '+sourceLabel+'雷达';
  byId('modeBadge').textContent=sourceLabel;
  byId('previewLink').hidden=preview;
  byId('viewerPresence').hidden=preview||!room;
  if(room){byId('previewLink').textContent='切换房间';byId('previewLink').href='/';}
  byId('humanWeaponOption').hidden=!localLive;
  byId('d3humanWeaponOption').hidden=!localLive;
  const displayKeys=['showNames','showExits','humanTeam','humanThermal','humanWeapon',...['human','bot'].flatMap(kind=>
    ['Visible','Name','Equipment','Durability','Health','Value','Distance','Direction','Crates'].map(field=>kind+field))];
  const display3dKeys=['showAvatars','d3Self','d3Allies',...['human','bot'].flatMap(kind=>
    ['Visible','Model','Name','Health','Equipment','Durability','Value','Distance','Box','Ray','Crates',...(kind==='human'?['Thermal','Weapon']:[])].map(field=>'d3'+kind+field))];
  const default3dOff=new Set(['d3humanDurability','d3humanValue','d3humanRay','d3botDurability','d3botValue','d3botBox','d3botRay']);
  for(const key of display3dKeys)byId(key).checked=!default3dOff.has(key);
  try {
    const saved=JSON.parse(localStorage.getItem('uam.mobile.display.v1')||'{}');
    for(const key of displayKeys)if(typeof saved?.[key]==='boolean')byId(key).checked=saved[key];
  }catch(_){}
  try {
    const saved=JSON.parse(localStorage.getItem('uam.mobile.display.3d.v1')||'{}');
    for(const key of display3dKeys)if(typeof saved?.[key]==='boolean')byId(key).checked=saved[key];
  }catch(_){}
  function saveDisplay() {
    try{localStorage.setItem('uam.mobile.display.v1',JSON.stringify(Object.fromEntries(displayKeys.map(key=>[key,byId(key).checked]))));}catch(_){}
  }
  function saveDisplay3d() {
    try{localStorage.setItem('uam.mobile.display.3d.v1',JSON.stringify(Object.fromEntries(display3dKeys.map(key=>[key,byId(key).checked]))));}catch(_){}
  }
  const setMapStatus=(text,error=false)=>{
    byId('mapStatus').textContent=text;byId('mapStatus').classList.toggle('error',error);
    byId('mapStatus').hidden=!text;
    byId('retryMap').hidden=!error;
  };
  function clearMarkers() {for(const marker of markers.values())map.removeLayer(marker);markers.clear();}
  function clearAnnotations(){for(const item of annotationLayers)map.removeLayer(item);annotationLayers=[];}
  function clearImages() {for(const image of imageLayers)map.removeLayer(image);imageLayers=[];bounds=focusBounds=null;annotationsReady=false;clearAnnotations();}
  function annotationPopup(point) {
    const popup=document.createElement('div');popup.className='poi-popup';
    const title=document.createElement('strong');title.textContent=point.name;popup.appendChild(title);
    for(const text of [...point.conditions,...point.descriptions]) {
      const content=annotationModel.plainText(text);if(!content)continue;
      const paragraph=document.createElement('p');paragraph.textContent=content;popup.appendChild(paragraph);
    }
    if(point.kind==='exit') {
      const note=document.createElement('p');note.className='poi-static-note';
      note.textContent='游戏静态撤离配置。条件会随模式、身份和出生位置变化，是否分配及开放以本局为准。';popup.appendChild(note);
    }
    return popup;
  }
  function renderAnnotations() {
    if(!map)return;clearAnnotations();
    if(!annotationsReady||!selectedFloor||!bounds)return;
    const points=annotationModel.visible(selected.annotations,selectedFloor,Math.pow(2,map.getZoom()-annotationBaseZoom),
      {names:byId('showNames').checked,exits:byId('showExits').checked});
    const occupied=[];
    for(const point of points) {
      const uv=projection.project(selectedFloor.projection,point.x,point.y);
      if(!uv||uv.u<0||uv.u>1||uv.v<0||uv.v>1)continue;
      const position=[selectedFloor.height*(1-uv.v),selectedFloor.width*uv.u];
      const pixel=map.latLngToContainerPoint(position),exit=point.kind==='exit';
      const font=Math.round(12*Math.max(.8,Math.min(1.4,point.textScale)));
      const width=Math.max(36,[...point.name].length*(exit?11:font)+10),height=exit?46:22;
      const box={left:pixel.x-width/2,right:pixel.x+width/2,top:pixel.y-(exit?12:height/2),bottom:pixel.y+(exit?height-12:height/2)};
      const overlaps=occupied.some(other=>box.left<other.right&&box.right>other.left&&box.top<other.bottom&&box.bottom>other.top);
      if(overlaps&&!exit)continue; // Keep exit icons available even when their labels collide.
      if(!overlaps)occupied.push(box);
      const content=document.createElement('div');
      if(exit){const symbol=document.createElement('span');symbol.className='poi-symbol';symbol.textContent='↗';content.appendChild(symbol);}
      const name=document.createElement('span');name.className='poi-name';name.textContent=point.name;
      if(!exit)name.style.fontSize=font+'px';content.appendChild(name);
      const item=L.marker(position,{pane:'mapAnnotations',keyboard:true,title:point.name,
        icon:L.divIcon({className:'map-poi '+point.kind+(overlaps?' compact':''),html:content,iconSize:[1,1],iconAnchor:[0,0]})})
        .bindPopup(annotationPopup(point),{maxWidth:280}).addTo(map);
      if(exit)item.bindTooltip(point.name,{direction:'top'});
      annotationLayers.push(item);
    }
    const all=selected.annotations,names=all.filter(p=>p.kind==='place').length,exits=all.filter(p=>p.kind==='exit').length;
    byId('annotationStatus').textContent='地点 '+names+' · 撤离位置 '+exits+
      (selected.annotationStatus==='ready'?'':(' · '+(selected.annotationError||'标注暂不可用')));
  }
  function televisionViewBounds(loaded,floor) {
    // Viewport framing only: TV textures have wide dark margins. Keep the full
    // native image bounds and projection untouched while fitting the floorplan.
    try {
      let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
      for(let i=0;i<loaded.length;++i) {
        const image=loaded[i],part=floor.parts[i],canvas=document.createElement('canvas');
        canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
        const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return null;
        context.drawImage(image,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
        const detailThreshold=48;
        for(let y=0;y<canvas.height;y+=2)for(let x=0;x<canvas.width;x+=2) {
          const p=(y*canvas.width+x)*4;
          if(pixels[p+3]<32||Math.max(pixels[p],pixels[p+1],pixels[p+2])<detailThreshold)continue;
          left=Math.min(left,part.x+x);right=Math.max(right,part.x+x);
          top=Math.min(top,part.y+y);bottom=Math.max(bottom,part.y+y);
        }
      }
      if(!Number.isFinite(left)||right-left<32||bottom-top<32)return null;
      return [[floor.height-bottom-24,left-24],[floor.height-top+24,right+24]];
    }catch(_){return null;}
  }
  function loadImage(part) {
    if(images.has(part.file))return images.get(part.file);
    const promise=new Promise((resolve,reject)=>{
      const image=new Image();
      const timer=setTimeout(()=>finish(false),30000);
      function finish(ok) {
        clearTimeout(timer);image.onload=image.onerror=null;
        if(ok&&image.naturalWidth===part.width&&image.naturalHeight===part.height)resolve(image);
        else {
          if(images.get(part.file)===promise)images.delete(part.file);
          reject(new Error('游戏地图图片加载失败'));
        }
      }
      image.onload=()=>finish(true);image.onerror=()=>finish(false);
      if(usesMapPack()) image.src=mapPack.imageUrl(part.file);
      else RadarPages.setImage(image,resourceUrl(part.file));
    });
    images.set(part.file,promise);
    while(images.size>8)images.delete(images.keys().next().value);
    return promise;
  }
  function fit() {
    if(is3d()){sceneRenderer?.resize();return;}
    if(!map||!bounds)return;
    const panelVisible=!byId('panel').hidden,small=innerWidth<=600,rect=byId('panel').getBoundingClientRect();
    map.invalidateSize({animate:false});
    map.fitBounds(focusBounds||bounds,{animate:false,paddingTopLeft:[!small&&panelVisible?rect.right+20:20,small?84:92],
      paddingBottomRight:[60,small&&panelVisible?rect.height+28:32]});
  }
  async function selectFloor(id) {
    const floor=selected?.layers.find(layer=>layer.id===id);if(!floor||!map)return false;
    selectedFloor=floor;const request=++generation;
    clearImages();clearMarkers();byId('fitMap').disabled=!is3d();byId('floorSelect').value=id;
    if(!publicModelPack||!is3d())byId('captionName').textContent=is3d()?'3D 场景':floor.name;
    byId('coordinateStatus').hidden=true;byId('coordinateStatus').textContent='';
    setMapStatus('加载地图…');
    try {
      const loaded=await Promise.all(floor.parts.map(loadImage));
      if(request!==generation)return false;
      bounds=[[0,0],[floor.height,floor.width]];
      if(selected.id==='tv')focusBounds=televisionViewBounds(loaded,floor);
      // Parts keep the game's crop offsets; never stretch them over the whole map.
      imageLayers=floor.parts.map((part,i)=>L.imageOverlay(loaded[i].src,
        [[floor.height-part.y-part.height,part.x],[floor.height-part.y,part.x+part.width]],
        {alt:selected.name+' '+floor.name+' 游戏内地图',interactive:false,
          className:part.blend==='lighten'?'atlas-overview-overlay':''}).addTo(map));
      byId('fitMap').disabled=false;fit();renderMarkers();
      annotationBaseZoom=map.getZoom();annotationsReady=true;renderAnnotations();
      setMapStatus('');
      updateFrameStatus();
      return true;
    }catch(_) {
      if(request!==generation)return false;
      setMapStatus('地图读取失败，请重试。',true);return false;
    }
  }
  function options(id,entries) {
    const target=byId(id);target.replaceChildren();
    for(const entry of entries){const option=document.createElement('option');option.value=entry.id;option.textContent=entry.name;target.appendChild(option);}
  }
  function updateMapSelection() {
    byId('mapSelect').value=preview||manualMapId?selected?.id||'':'auto';
    byId('mapEdition').textContent=preview?'地图预览':manualMapId?'手动选图':'自动跟随地图';
  }
  function selectMap(id) {
    const item=maps.find(item=>item.id===id);if(!item)return;
    const changed=selected?.id!==item.id;
    selected=item;
    if(!publicModelPack||!is3d()){byId('mapName').textContent=item.name;updateMapSelection();}
    if(changed&&!publicModelPack)invalidateScene();
    options('floorSelect',item.layers);
    const floor=preview?params.get('floor'):null;
    const full=item.layers.find(layer=>layer.overview||layer.name.includes('全图'))||item.layers[0];
    void selectFloor(item.layers.some(layer=>layer.id===floor)?floor:full.id);
  }
  function followMap() {
    if(preview||manualMapId||!atlas||lastPacket?.active!==true||!matchesAtlas(lastPacket)||
       lastPacket.coordinateSpace!=='ue-world-centimeters')return;
    const item=maps.find(item=>item.gameMapId===lastPacket.mapId);
    if(!item)return;
    if(followedMapId!==item.gameMapId||selected?.id!==item.id||!selectedFloor)selectMap(item.id);
    followedMapId=item.gameMapId;
  }
  function updateFrameStatus() {
    const packet=lastPacket;
    let text='';
    if(!preview&&packet?.active===true&&atlas) {
      if(!matchesAtlas(packet))text=usesMapPack()?'缺少当前对局底图':'区服与地图不匹配';
      else if(packet.coordinateSpace!=='ue-world-centimeters')text='坐标格式不匹配';
      else if(!Number.isInteger(packet.mapId)||packet.mapId<=0)text='地图识别中…';
      else if(packet.mapId!==selected?.gameMapId)text=manualMapId?'当前为手动选图，实时目标仅在对局地图显示':'缺少当前地图资源';
    }
    byId('frameStatus').textContent=text;byId('frameStatus').hidden=!text;
  }
  function validCatalog(value) {
    return value?.schema===2&&value.game==='uam-mobile'&&['cn','global'].includes(value.region)&&Array.isArray(value.maps)&&value.maps.length>0&&
      value.maps.every(item=>typeof item?.id==='string'&&typeof item.name==='string'&&Number.isInteger(item.gameMapId)&&
        Array.isArray(item.layers)&&item.layers.length>0&&item.layers.every(layer=>typeof layer?.id==='string'&&typeof layer.name==='string'&&
          Number.isFinite(layer.width)&&Number.isFinite(layer.height)&&layer.width>0&&layer.height>0&&layer.width<=8192&&layer.height<=8192&&
          projection.valid(layer.projection)&&Array.isArray(layer.parts)&&layer.parts.length>0&&layer.parts.every(part=>
            typeof part?.file==='string'&&/^\/atlas\/image\/\d+\.png$/.test(part.file)&&['x','y','width','height'].every(k=>Number.isFinite(part[k]))&&
            part.width>0&&part.height>0&&part.width<=8192&&part.height<=8192)));
  }
  function addOverview(item) {
    if(item.id!=='tv'||item.layers.length<2)return item;
    const base=item.layers[0],keys=['xx','xy','yx','yy','offsetX','offsetY'];
    // Overlay only aligned native planes, never scale or guess a second transform.
    if(!item.layers.every(layer=>layer.width===base.width&&layer.height===base.height&&
      keys.every(key=>Math.abs(layer.projection[key]-base.projection[key])<1e-12)))return item;
    const overview={...base,id:'overview',name:'全图',overview:true,
      parts:item.layers.flatMap((layer,index)=>layer.parts.map(part=>({...part,blend:index?'lighten':'normal'})))};
    return {...item,layers:[overview,...item.layers]};
  }
  function clearCatalog() {
    ++generation;clearImages();clearMarkers();images.clear();
    atlas=null;maps=[];selected=selectedFloor=null;
    byId('fitMap').disabled=true;byId('mapSelect').disabled=true;byId('floorSelect').disabled=true;
  }
  function applyCatalog(value) {
    atlasRevision=typeof value.revision==='string'?value.revision:'';
    atlas=value;maps=value.maps.map(item=>addOverview({...item,annotations:annotationModel.prepare(item.annotations)}));
    if(!maps.some(item=>item.id===manualMapId))manualMapId='';
    options('mapSelect',preview?maps:[{id:'auto',name:'跟随当前对局'},...maps]);
    byId('mapCount').textContent=maps.length+' 张地图';
    byId('sourceInfo').textContent=(value.region==='cn'?'国服':'国际服')+' · '+value.version+' · ';
    byId('mapSelect').disabled=false;byId('floorSelect').disabled=is3d();
    const id=preview?params.get('map'):manualMapId;
    if(!preview&&!manualMapId&&lastPacket?.active===true&&matchesAtlas(lastPacket)&&lastPacket.coordinateSpace==='ue-world-centimeters'&&
       maps.some(item=>item.gameMapId===lastPacket.mapId))followMap();
    else selectMap(maps.some(item=>item.id===id)?id:maps[0].id);
    updateFrameStatus();
  }
  async function loadCatalog() {
    if(mapPackLoader)return;
    clearTimeout(catalogRetry);catalogLoading=true;
    const request=++catalogGeneration;
    clearCatalog();
    setMapStatus('加载地图…');
    let failureMessage='';
    try {
      const response=await RadarPages.fetch(resourceUrl('/atlas/manifest.json'),{cache:'no-store'});
      if(request!==catalogGeneration)return;
      if(room&&response.status===401){location.assign('./?room='+room);return;}
      if(response.ok){
        const value=await response.json();
        if(request!==catalogGeneration)return;
        if(validCatalog(value)){applyCatalog(value);return;}
      }else{
        const failure=await response.json().catch(()=>null);
        if(typeof failure?.message==='string')failureMessage=failure.message.slice(0,512);
      }
    }catch(_) {
      // A network or JSON failure takes the same retry path as an unavailable catalog.
    }finally{if(request===catalogGeneration)catalogLoading=false;}
    if(request!==catalogGeneration)return;
    setMapStatus(failureMessage?'地图配置不可用：'+failureMessage:
      room?'等待手机同步地图，完成后自动显示…':'地图配置不可用，请检查游戏资源。',!room);
    if(room)catalogRetry=setTimeout(()=>{void loadCatalog();},5000);
  }
  function requiredPackRegion(packet) {
    const current=mapPack?.catalog.region||'cn';
    if(!validLivePacket(packet))return current;
    if(packet.region==='cn')return 'cn';
    return mapPack&&!mapPack.supports(packet)?'global':current;
  }
  async function loadMapPack(region=requiredPackRegion(lastPacket)) {
    if(mapPack?.catalog.region===region||mapPackRequest)return;
    const request={region,controller:new AbortController()};
    mapPackRequest=request;
    failedPackRegion='';
    const label=region==='cn'?'国服底图':'国际服底图';
    const result=await mapPackLoader.load(request.controller.signal,validCatalog,text=>{
      if(mapPackRequest===request)setMapStatus(label+' · '+text);
    },region);
    if(mapPackRequest!==request){result.pack?.dispose();return;}
    mapPackRequest=null;
    if(!result.pack){
      failedPackRegion=region;
      setMapStatus(label+' · '+(result.canceled?'加载已取消，请重试':result.error),true);
      return;
    }
    clearCatalog();
    mapPack?.dispose();
    mapPack=result.pack;
    applyCatalog(mapPack.catalog);
    if(lastPacket)syncRoomCatalog(lastPacket);
  }
  const available=value=>Number.isFinite(value)&&value>=0;
  function equipmentText(prefix,level,durability,showLevel,showDurability,missing='—') {
    return prefix+(showLevel?(Number.isInteger(level)&&level>=0&&level<=6?level:missing):'')+
      (showDurability?' ['+(available(durability)?Math.floor(durability):missing)+']':'');
  }
  function equipmentColor(level) {
    // Keep each slot and its durability aligned with EquipmentLevelColor in PlayerHeaderLayout.cpp.
    const colors=['#ffffff','#ffffff','#00ff00','#64ffff','#ff64ff','#ffff64','#ff0000'];
    return Number.isInteger(level)&&level>=0&&level<=6?colors[level]:'#b4b4b4';
  }
  function mapDirection(entity) {
    if(!selectedFloor)return null;
    let x=entity.vx,y=entity.vy;
    if(entity.tp===0 && Object.hasOwn(entity,'yaw')) {
      if(!Number.isFinite(entity.yaw)||Math.abs(entity.yaw)>360)return null;
      const radians=entity.yaw*Math.PI/180;
      x=Math.cos(radians);y=Math.sin(radians);
    } else if(![x,y].every(Number.isFinite)||Math.hypot(x,y)<=3)return null;
    return projection.direction(selectedFloor.projection,x,y,selectedFloor.width,selectedFloor.height);
  }
  function playerMapSlot(prefix,level,durability,showLevel,showDurability) {
    const grade=showLevel && Number.isInteger(level) && level>=0 && level<=6;
    const condition=showDurability && available(durability);
    if(!grade && !condition)return null;
    return {text:equipmentText(prefix,level,durability,grade,condition),color:equipmentColor(level)};
  }
  function entityVisual(entity,packet,three=false) {
    const bot=entity.tp===1,kind=bot?'bot':'human';
    const show=field=>byId((three?'d3':'')+kind+field).checked;
    if(!show('Visible'))return null;
    const ally=!bot&&packet.t>0&&entity.t===packet.t;
    if(three&&ally&&!byId('d3Allies').checked)return null;
    const ratio=show('Health')&&available(entity.hp)&&Number.isFinite(entity.mh)&&entity.mh>0?
      Math.max(0,Math.min(1,entity.hp/entity.mh)):null;
    let value='';
    if(show('Value') && available(entity.val)) {
      value=entity.val>=10000?(entity.val/10000).toFixed(1)+'w':String(Math.floor(entity.val));
      if(!three)value='['+value+']';
    } else if(three && show('Value'))value='--';
    return {className:kind+(ally?' ally':''),
      direction:!three&&show('Direction')?mapDirection(entity):null,
      thermal:!bot&&show('Thermal')&&entity.t7===true,
      model:three&&show('Model'),box:three&&show('Box'),ray:three&&show('Ray'),
      healthText:show('Health')?(available(entity.hp)&&available(entity.mh)?Math.round(entity.hp)+' / '+Math.round(entity.mh):'—'):'',
      name:show('Name')?(typeof entity.n==='string'&&entity.n?entity.n:(bot?'人机':three?'真人':'')):'',value,
      weapon:localLive&&!bot&&show('Weapon')&&typeof entity.weapon==='string'?entity.weapon.trim():'',
      team:(three||bot||show('Team'))&&Number.isInteger(entity.t)&&entity.t>0?String(entity.t):'',teamId:Number.isInteger(entity.t)?entity.t:0,ratio,labelOffset:ratio!==null?20:bot?12.5:14,
      healthMissing:show('Health')&&ratio===null,
      distance:show('Distance')?(available(distanceFromView(entity))?(three?Math.floor:Math.round)(distanceFromView(entity))+'m':three?'--m':'— m'):'',
      equipment:!three&&!bot?[
        playerMapSlot('头',entity.hl,entity.hd,show('Equipment'),show('Durability')),
        playerMapSlot('甲',entity.al,entity.ad,show('Equipment'),show('Durability'))].filter(Boolean):
        show('Equipment')||show('Durability')?[
        {text:equipmentText(three?'T:':'头',entity.hl,entity.hd,show('Equipment'),show('Durability'),three?'--':'—'),color:equipmentColor(entity.hl)},
        {text:equipmentText(three?'H:':'甲',entity.al,entity.ad,show('Equipment'),show('Durability'),three?'--':'—'),color:equipmentColor(entity.al)}]:[]};
  }
  function crateVisual(entity,three=false) {
    const prefix=three?'d3':'';
    const human=byId(prefix+'humanCrates').checked,bot=byId(prefix+'botCrates').checked;
    const kind=entity.ck==='human'?'human':entity.ck==='bot'?'bot':'unknown';
    if(kind==='human'?!human:kind==='bot'?!bot:!(human&&bot))return null;
    const showDistance=kind==='unknown'?byId(prefix+'humanDistance').checked&&byId(prefix+'botDistance').checked:byId(prefix+kind+'Distance').checked;
    return {className:'crate '+kind,name:kind==='human'?'真人盒子':kind==='bot'?'人机盒子':'未识别盒子',
      distance:showDistance?(available(distanceFromView(entity))?Math.round(distanceFromView(entity))+'m':'— m'):'',equipment:[]};
  }
  function markerContent(visual) {
    const content=document.createElement('div');
    function part(parent,tag,className,text) {
      const node=document.createElement(tag);node.className=className;
      if(text!==undefined)node.textContent=text;
      parent.appendChild(node);return node;
    }
    if(visual.className.startsWith('crate')) {
      part(content,'span','radar-crate-symbol').setAttribute('aria-hidden','true');
      const bottom=part(content,'div','radar-bottom');
      const label=part(bottom,'div','radar-crate-label');
      part(label,'span','radar-crate-name',visual.name);
      if(visual.distance)part(label,'span','radar-distance','['+visual.distance+']');
      return content;
    }
    const player=visual.className.startsWith('human');
    if(player && Number.isFinite(visual.direction)) {
      const line=part(content,'span','radar-heading');
      line.setAttribute('aria-hidden','true');
      line.style.transform='rotate('+visual.direction+'rad)';
    } else if(Number.isFinite(visual.direction)) {
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('class','radar-direction');svg.setAttribute('viewBox','-56 -56 112 112');svg.setAttribute('aria-hidden','true');
      svg.style.transform='rotate('+visual.direction+'rad)';
      const radius=(visual.className.startsWith('bot')?8.5:10)+42,half=.7,segments=10,arc=[];
      for(let i=0;i<=segments;++i){const a=-half+2*half*i/segments;arc.push([Math.cos(a)*radius,Math.sin(a)*radius]);}
      for(let i=0;i<segments;++i){const wedge=document.createElementNS('http://www.w3.org/2000/svg','path');
        wedge.setAttribute('d','M0 0 L'+arc[i].join(' ')+' L'+arc[i+1].join(' ')+' Z');
        wedge.setAttribute('fill','#ddd');wedge.setAttribute('fill-opacity',String(.06+Math.abs(i-segments/2)*.02));wedge.setAttribute('stroke','none');svg.appendChild(wedge);}
      const edge=document.createElementNS('http://www.w3.org/2000/svg','path');edge.setAttribute('d',arc.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' '));
      edge.setAttribute('fill','none');edge.setAttribute('stroke','#ccc');edge.setAttribute('stroke-opacity','.3');edge.setAttribute('stroke-width','1');svg.appendChild(edge);
      content.appendChild(svg);
    }
    if(visual.ratio!==null&&visual.ratio!==undefined) {
      const color=visual.ratio>.6?'#00ff00':visual.ratio>.3?'#ffff00':'#ff0000';
      const ring=part(content,'div','radar-health');
      ring.style.background='conic-gradient('+color+' '+(visual.ratio*100)+'%,rgba(0,0,0,.43) 0)';
      ring.setAttribute('aria-label','血量 '+Math.round(visual.ratio*100)+'%');
    }
    const dot=part(content,'span','radar-dot',visual.team||'');
    if(player && !visual.className.includes('ally') && visual.teamId>0)
      dot.style.backgroundColor='hsl('+(((visual.teamId-2)*137+480)%360)+' 100% 50%)';
    if(visual.thermal||visual.name||visual.value||visual.weapon||visual.equipment?.length) {
      // Only visible rows occupy space. The stack is anchored just above the dot/ring,
      // so equipment settles into the name row's place when name and value are off.
      const above=part(content,'div','radar-above');above.style.bottom=(visual.labelOffset??10)+'px';
      if(visual.equipment?.length) {
        const gear=part(above,'div','radar-equipment');
        for(const slot of visual.equipment)part(gear,'span','radar-equipment-slot',slot.text).style.color=slot.color;
      }
      if(visual.thermal||visual.name||visual.value) {
        const title=part(above,'div','radar-title');
        if(visual.thermal) {
          const badge=part(title,'span','radar-thermal','T7');
          badge.setAttribute('aria-label','T7 热成像');
        }
        if(visual.name)part(title,'span','radar-name',visual.name);
        if(visual.value)part(title,'span','radar-value',visual.value);
      }
      if(visual.weapon)part(above,'div','radar-weapon',visual.weapon);
    }
    if(visual.distance||visual.healthMissing) {
      const bottom=part(content,'div','radar-bottom');bottom.style.top=(visual.labelOffset??10)+'px';
      if(visual.distance)part(bottom,'div','radar-distance',visual.distance);
      if(visual.healthMissing)part(bottom,'div','radar-health-missing','血量 —');
    }
    return content;
  }
  function sceneLabel(visual) {
    const header=document.createElement('div');header.className='scene-label';
    const part=(parent,tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;parent.appendChild(node);return node;};
    if(visual.thermal)part(header,'span','scene-thermal','T7热成像');
    if(visual.equipment?.length) {
      const gear=part(header,'div','scene-gear');
      visual.equipment.forEach((slot,i)=>{if(i)part(gear,'span','scene-gear-separator',' | ');part(gear,'span','scene-gear-slot',slot.text).style.color=slot.color;});
    }
    if(visual.name||visual.value) {
      const title=part(header,'div','scene-title');
      if(visual.name&&visual.team&&!visual.className.includes('bot')) {
        const team=part(title,'span','scene-team',visual.team+'-');
        const colors=['#ff9999','#99ff99','#9999ff','#ffff99','#ff99ff','#99ffff','#cccccc','#ffcc99'];
        team.style.color=colors[Number(visual.team)-1]||'#e6e6e6';
      }
      if(visual.name)part(title,'span','scene-name',visual.name);
      if(visual.value)part(title,'span','scene-value',(visual.name?'-':'')+visual.value);
    }
    if(visual.weapon)part(header,'div','scene-weapon',visual.weapon);
    if(visual.ratio!==null&&visual.ratio!==undefined||visual.healthMissing) {
      const track=part(header,'div','scene-health');track.setAttribute('aria-label','血量 '+(visual.healthMissing?'--':visual.healthText));
      if(visual.healthMissing)part(track,'span','scene-health-missing','--');
      else if(visual.ratio>.01){
        const palette=[[190,55,55],[55,165,170],[190,150,40],[130,75,185],[55,160,90],[185,110,70]];
        const team=visual.teamId||0,base=palette[((team%palette.length)+palette.length)%palette.length],brightness=.3+.7*visual.ratio;
        const bar=part(track,'span','scene-health-fill');bar.style.width=visual.ratio*100+'%';
        bar.style.background='rgb('+base.map(value=>Math.floor(value*brightness)).join(',')+')';
        if(visual.ratio<.1)bar.style.borderRadius='0';
      }
    }
    header.hidden=!(visual.thermal||visual.equipment?.length||visual.name||visual.value||visual.weapon||
      visual.ratio!==null&&visual.ratio!==undefined||visual.healthMissing);
    return header;
  }
  function marker(id,x,y,visual,keep) {
    if(!visual||!Number.isFinite(x)||!Number.isFinite(y))return;
    const point=projection.project(selectedFloor.projection,x,y);
    if(!point||point.u<0||point.u>1||point.v<0||point.v>1)return;
    keep.add(id);const position=[selectedFloor.height*(1-point.v),selectedFloor.width*point.u];
    let item=markers.get(id);
    const key=JSON.stringify(visual);
    if(!item||item.visualKey!==key) {
      const icon=L.divIcon({className:'radar-target '+visual.className,html:markerContent(visual),iconSize:[1,1],iconAnchor:[0,0]});
      if(!item){item=L.marker(position,{pane:'radarLive',interactive:false,keyboard:false,icon}).addTo(map);markers.set(id,item);}
      else item.setIcon(icon);
      item.visualKey=key;
    }
    item.setLatLng(position);
  }
  function renderMarkers() {
    updateFollow();
    if(is3d()){clearMarkers();renderScene();return;}
    if(!map||!bounds||!selectedFloor||!atlas||lastPacket?.active!==true){clearMarkers();return;}
    const packet=lastPacket;
    if(!matchesAtlas(packet)||packet.coordinateSpace!=='ue-world-centimeters'||
       !Number.isInteger(packet.mapId)||packet.mapId<=0||packet.mapId!==selected.gameMapId){clearMarkers();return;}
    const ox=Number.isFinite(packet.ox)?packet.ox:0,oy=Number.isFinite(packet.oy)?packet.oy:0,keep=new Set();
    marker('self',packet.sx+ox,packet.sy+oy,{className:'self',name:'自己'},keep);
    for(const entity of packet.e) {
      if(!entity||![0,1,4].includes(entity.tp)||typeof entity.i!=='string'||!Number.isFinite(entity.x)||!Number.isFinite(entity.y))continue;
      marker((entity.tp===4?'crate:':'actor:')+entity.i,entity.x+ox,entity.y+oy,
        entity.tp===4?crateVisual(entity):entityVisual(entity,packet),keep);
    }
    for(const [id,item] of markers)if(!keep.has(id)){map.removeLayer(item);markers.delete(id);}
    if(follow2d){const point=observationPoint();const uv=point&&projection.project(selectedFloor.projection,point.x,point.y);
      if(uv)map.panTo([selectedFloor.height*(1-uv.v),selectedFloor.width*uv.u],{animate:false});}
  }
  function validLivePacket(packet=lastPacket) {
    return packet?.active===true&&packet.coordinateSpace==='ue-world-centimeters'&&
      ['cn','global'].includes(packet.region)&&Number.isInteger(packet.mapId)&&packet.mapId>0&&
      Number.isFinite(packet.sx)&&Number.isFinite(packet.sy);
  }
  function teammates() {
    if(!validLivePacket()||!(lastPacket.t>0))return [];
    const seen=new Set();
    return lastPacket.e.filter(e=>e&&e.tp===0&&e.t===lastPacket.t&&typeof e.i==='string'&&e.i&&e.i!==lastPacket.sid&&
      Number.isFinite(e.x)&&Number.isFinite(e.y)&&!seen.has(e.i)&&seen.add(e.i)).sort((a,b)=>a.i.localeCompare(b.i));
  }
  function updateFollow() {
    const roster=teammates(),session=validLivePacket()?lastPacket.region+':'+lastPacket.mapId+':'+(lastPacket.session||''):'';
    if(session!==rosterSession){followId='self';follow2d=false;rosterSession=session;rosterKey='';byId('followStatus').hidden=true;}
    if(followId!=='self'&&!roster.some(e=>e.i===followId)) {
      followId='self';byId('followStatus').textContent='队友数据已失效，已回到自己';byId('followStatus').hidden=false;
    }
    const entries=[{id:'self',name:'自己'},...roster.map((e,index)=>({id:e.i,name:'队友 '+(e.n||String(index+1))}))];
    const key=JSON.stringify(entries);
    if(key!==rosterKey){options('followSelect',entries);rosterKey=key;}
    byId('followSelect').value=followId;byId('followSelect').disabled=!validLivePacket();
    byId('followScene').disabled=!validLivePacket();
    if(is3d())byId('captionName').textContent='3D · '+(entries.find(e=>e.id===followId)?.name||'自己');
  }
  function observationPoint() {
    if(!validLivePacket())return null;
    const p=lastPacket,e=followId==='self'?null:teammates().find(e=>e.i===followId);
    const z=e?e.z:p.sz;
    const point={id:e?e.i:p.sid,x:(e?e.x:p.sx)+(Number.isFinite(p.ox)?p.ox:0),y:(e?e.y:p.sy)+(Number.isFinite(p.oy)?p.oy:0),
      z:Number.isFinite(z)&&Number.isFinite(p.oz)?z+p.oz:undefined};
    if(!e&&[p.syaw,p.spitch,point.z].every(Number.isFinite))point.view={x:point.x,y:point.y,z:point.z,yaw:p.syaw,pitch:p.spitch,expiresAt:lastFrameAt+2500};
    if(e&&avatarAsset) {
      const pose=globalThis.UamRadarAvatar?.pose(e,p,lastFrameAt,performance.now());
      const view=pose&&globalThis.UamRadarAvatar.view(avatarAsset,pose);
      if(view)point.view={x:point.x+view.x*100,y:point.y+view.y*100,z:point.z+view.z*100,yaw:view.yaw,pitch:view.pitch,expiresAt:pose.expiresAt};
    }
    return point;
  }
  function distanceFromView(entity) {
    if(followId==='self')return entity.d;
    const ally=teammates().find(e=>e.i===followId);
    if(!ally||![entity.x,entity.y,entity.z,ally.x,ally.y,ally.z].every(Number.isFinite))return undefined;
    return Math.hypot(entity.x-ally.x,entity.y-ally.y,entity.z-ally.z)*.01;
  }
  function sceneStatus(text,error=false) {
    byId('sceneStatus').textContent=text;byId('sceneStatus').hidden=!is3d()||!text;
    byId('sceneStatus').classList.toggle('error',error);byId('retryScene').hidden=!is3d()||!error;
  }
  function invalidateScene() {
    clearTimeout(sceneRetry);
    ++sceneGeneration;sceneAbort?.abort();sceneAbort=null;sceneBusy=false;sceneKey='';sceneTransfer=null;nextSceneFetch=0;sceneRenderer?.clear();
  }
  function sceneContext() {
    const live=validLivePacket();
    if(publicModelPack){
      const selection=byId('sceneMapSelect').value;
      const entry=selection==='auto'?
        (live?publicModelPack.maps.find(item=>item.mapId===lastPacket.mapId):
          publicModelPack.maps.find(item=>item.id===selected?.id)||publicModelPack.maps[0]):
        publicModelPack.maps.find(item=>item.id===selection);
      if(!entry)return null;
      const sameMap=live&&entry.mapId===lastPacket.mapId;
      const point=sameMap?observationPoint():null;
      const hasOrigin=sameMap&&Number.isFinite(lastPacket.oz);
      return {request:{...entry,key:'model-pack:'+entry.id},point:Number.isFinite(point?.z)?point:null,
        matched:hasOrigin,waitingHeight:sameMap&&(!hasOrigin||!Number.isFinite(point?.z))};
    }
    const region=atlas?.region||(live?lastPacket.region:null),mapId=selected?.gameMapId||(live?lastPacket.mapId:0);
    const matched=live&&lastPacket.region===region&&lastPacket.mapId===mapId;
    let point=matched?observationPoint():null;
    if(matched&&point&&!Number.isFinite(point.z))point=null;
    if(!point&&selectedFloor){const center=projection.unproject(selectedFloor.projection,.5,.5);if(center)point={x:center.x,y:center.y};}
    const request=sceneModel?.request(region,mapId,'0',0,viewMode==='3d-color');
    return request?{request,point,matched:matched&&Number.isFinite(point?.z)}:null;
  }
  async function refreshModelPack(request,force) {
    if(sceneKey!==request.key){invalidateScene();sceneKey=request.key;}
    if(sceneBusy||(sceneTransfer&&sceneTransfer.next===sceneTransfer.pages)||(!force&&performance.now()<nextSceneFetch))return;
    if(sceneTransfer){sceneRenderer.clear();sceneTransfer=null;}

    const controller=new AbortController();
    const generation=++sceneGeneration;
    sceneAbort=controller;sceneBusy=true;
    sceneStatus('正在请求 '+request.name+' 的 3D 地图…');
    try {
      const result=await publicModelPack.load(request,controller.signal,message=>{
        if(generation===sceneGeneration)sceneStatus(message);
      });
      if(generation!==sceneGeneration||controller.signal.aborted)return;
      if(!result.scene){
        sceneStatus(result.error||'3D 地图加载失败，可重试',true);
        nextSceneFetch=Infinity;
        return;
      }
      const {pages,...geometry}=result.scene;
      sceneTransfer={pages:pages.length,next:0};
      sceneStatus('正在显示 3D 地图…');
      for(let index=0;index<pages.length;++index){
        const vertices=pages[index];
        const page={...geometry,vertices,page:index,pages:pages.length,count:vertices.length/9,
          surfaces:false,signature:request.key};
        if(!sceneRenderer.addPage(page)){
          sceneRenderer.clear();sceneTransfer=null;
          sceneStatus('3D 图形资源暂不可用，可重试或切回 2D',true);
          nextSceneFetch=Infinity;
          return;
        }
        pages[index]=null;++sceneTransfer.next;
        if(index+1<pages.length){
          await new Promise(resolve=>setTimeout(resolve,0));
          if(generation!==sceneGeneration)return;
        }
      }
      sceneStatus('3D 地图已加载');
      renderScene(false);
    }catch(_){
      if(generation===sceneGeneration){
        sceneRenderer.clear();sceneTransfer=null;nextSceneFetch=Infinity;
        sceneStatus('3D 图形资源暂不可用，可重试或切回 2D',true);
      }
    }finally{if(generation===sceneGeneration){sceneBusy=false;sceneAbort=null;}}
  }
  async function refreshScene(force=false) {
    if(!is3d()||(room&&!publicModelPack)||!sceneRenderer)return;
    const context=sceneContext();
    if(!context){
      if(sceneKey)invalidateScene();
      sceneStatus(publicModelPack?'当前地图暂无对应的 3D 模型':'等待地图或有效的对局坐标…');
      return;
    }
    if(publicModelPack){await refreshModelPack(context.request,force);return;}
    const root=context.request;
    if(sceneKey!==root.key){invalidateScene();sceneKey=root.key;}
    if(sceneBusy||(!force&&performance.now()<nextSceneFetch))return;
    const request=sceneTransfer&&sceneTransfer.next<sceneTransfer.pages?
      sceneModel.request(root.region,root.mapId,sceneTransfer.revision,sceneTransfer.next,root.textured):root;
    const generation=++sceneGeneration;sceneBusy=true;const controller=new AbortController();sceneAbort=controller;
    const timeout=setTimeout(()=>controller.abort(),20000);
    let continueTransfer=false;
    try {
      const response=await RadarPages.fetch(request.key,{cache:request.revision==='0'?'no-store':'default',signal:controller.signal});
      if(generation!==sceneGeneration)return;
      if(response.status===202) {
        const progress=await response.json();if(generation!==sceneGeneration)return;
        const delay=sceneTransfer?30:300;
        sceneStatus(progress.message||'正在索引本地模型…');nextSceneFetch=performance.now()+delay;
        clearTimeout(sceneRetry);sceneRetry=setTimeout(()=>{if(generation===sceneGeneration)void refreshScene();},delay);return;
      }
      if(response.status===409){invalidateScene();sceneStatus('模型版本已变化，正在重新加载整图…');return;}
      if(!response.ok) {
        let reason='本地模型暂不可用，请重试';
        try{reason=(await response.json()).message||reason;}catch(_){}
        if(generation!==sceneGeneration)return;
        sceneStatus(reason+(sceneTransfer?' · 已加载 '+sceneTransfer.next+'/'+sceneTransfer.pages+'，等待重试':''),true);
        nextSceneFetch=performance.now()+3000;return;
      }
      const decoded=sceneModel.decode(await response.arrayBuffer(),request);
      if(generation!==sceneGeneration)return;
      if(!decoded){sceneStatus('3D 分片校验失败，当前场景尚未加载完整',true);nextSceneFetch=performance.now()+3000;return;}
      if(request.revision==='0') {
        if(sceneTransfer?.revision===decoded.revision&&sceneTransfer.next===decoded.pages&&sceneTransfer.signature===decoded.signature) {
          sceneStatus(decoded.flags&2?'可用模型已加载，部分源资源尚未就绪':'整图已加载'+(decoded.terrain?' · 地形已包含':''),Boolean(decoded.flags&2));
          nextSceneFetch=performance.now()+30000;return;
        }
        sceneRenderer.clear();sceneTransfer={revision:decoded.revision,pages:decoded.pages,total:decoded.total,next:0,triangles:0,signature:decoded.signature};
      }
      if(!sceneTransfer||decoded.signature!==sceneTransfer.signature||decoded.page!==sceneTransfer.next) {
        invalidateScene();sceneStatus('整图分片不属于同一版本，正在重新加载…');return;
      }
      if(!sceneRenderer.addPage(decoded)){sceneStatus('3D 图形资源暂不可用，整图尚未加载完成，可重试或切回 2D',true);nextSceneFetch=performance.now()+3000;return;}
      ++sceneTransfer.next;sceneTransfer.triangles+=decoded.count;renderScene(false);
      if(sceneTransfer.next===sceneTransfer.pages) {
        if(sceneTransfer.triangles!==sceneTransfer.total){invalidateScene();sceneStatus('整图几何数量不匹配，请重新加载',true);return;}
        sceneStatus(decoded.flags&2?'可用模型已加载，部分源资源尚未就绪':'整图已加载'+(decoded.terrain?' · 地形已包含':''),Boolean(decoded.flags&2));
        nextSceneFetch=performance.now()+30000;
      }else {
        sceneStatus('正在加载整图 '+sceneTransfer.next+' / '+sceneTransfer.pages+' · 后续分片继续传输');
        nextSceneFetch=0;continueTransfer=true;
      }
    }catch(_) {
      if(generation===sceneGeneration){sceneStatus('3D 分片连接中断，等待续传',true);nextSceneFetch=performance.now()+3000;}
    }finally{clearTimeout(timeout);if(generation===sceneGeneration){sceneBusy=false;sceneAbort=null;if(continueTransfer)void refreshScene();}}
  }
  async function loadAvatar(force=false) {
    if(!sceneRenderer||(room&&!publicModelPack)||avatarBusy||avatarAsset||(!force&&performance.now()<avatarRetryAt))return;
    avatarBusy=true;avatarMessage='正在加载'+avatarLabel+'…';
    const controller=publicModelPack?null:new AbortController();
    const timeout=controller?setTimeout(()=>controller.abort(),15000):undefined;
    try {
      let model;
      if(publicModelPack)model=await globalThis.DfmRadarAvatarPack?.model();
      else{
        const response=await RadarPages.fetch('/avatar/nailong.json',{cache:'no-store',signal:controller.signal});
        if(response.ok)model=globalThis.UamRadarAvatar?.decode(await response.json());
      }
      if(model&&sceneRenderer.setAvatar(model)){avatarAsset=model;standingPoses.clear();avatarMessage='';}
      else {avatarMessage=avatarLabel+'暂不可用，可重新加载';avatarRetryAt=performance.now()+3000;}
    }catch(_){avatarMessage=avatarLabel+'连接中断，等待重试';avatarRetryAt=performance.now()+3000;}
    finally{clearTimeout(timeout);avatarBusy=false;if(is3d())renderScene(false);}
  }
  function standingAvatar(yaw,self) {
    const degrees=Number.isFinite(yaw)?(Math.round(yaw)%360+360)%360:0;
    const key=degrees+(self?360:0);
    if(!standingPoses.has(key)){
      // The observer uses the camera origin. Player positions use the capsule center.
      const angle=degrees*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
      const matrix=[c,-s,0,0,s,c,0,0,0,0,1,self?-1.65:-.9];
      const matrices=new Float32Array(avatarAsset.influenceBounds.length*matrix.length);
      for(let at=0;at<matrices.length;at+=matrix.length)matrices.set(matrix,at);
      standingPoses.set(key,{matrices,bounds:globalThis.UamRadarAvatar.bounds(avatarAsset,{matrices})});
    }
    return standingPoses.get(key);
  }
  function renderScene(load=true) {
    if(!sceneRenderer)return;
    const context=sceneContext(),items=[];
    if(publicModelPack){
      byId('mapName').textContent=context?.request.name||selected?.name||'等待地图';
      byId('mapEdition').textContent=preview?'地图预览':byId('sceneMapSelect').value==='auto'?'自动跟随地图':'手动选图';
    }
    if(context?.matched) {
      const p=lastPacket,ox=Number.isFinite(p.ox)?p.ox:0,oy=Number.isFinite(p.oy)?p.oy:0;
      const now=performance.now();
      const add=(x,y,z,visual,entity)=>{
        if(!visual||![x,y,z,p.oz].every(Number.isFinite))return;
        const crate=visual.className.startsWith('crate');
        const node=document.createElement('div');node.className=(crate?'radar-target ':'scene-target ')+visual.className;
        node.appendChild(crate?markerContent(visual):sceneLabel(visual));
        let distanceLabel=null;
        if(!crate&&visual.distance){distanceLabel=document.createElement('div');distanceLabel.className='scene-distance';distanceLabel.textContent=visual.distance;node.appendChild(distanceLabel);}
        const tracked=!crate?globalThis.UamRadarAvatar?.pose(entity,p,lastFrameAt,now):null;
        const self=visual.className==='self';
        const standing=publicModelPack&&!crate&&!tracked&&avatarAsset?standingAvatar(self?p.syaw:entity?.yaw,self):null;
        const spatialPose=tracked||(standing&&{matrices:standing.matrices,expiresAt:lastFrameAt+2500});
        const avatar=byId('showAvatars').checked&&visual.model?spatialPose:null;
        const bodyBounds=standing?.bounds||(tracked&&avatarAsset?globalThis.UamRadarAvatar.bounds(avatarAsset,tracked):null);
        const tint=visual.className==='self'?[.13,.53,1]:visual.className.includes('ally')?[.17,.74,.51]:visual.className.includes('bot')?[1,1,1]:[1,.2,.2];
        items.push({id:entity?.i||(visual.className==='self'?p.sid:''),x:x+ox,y:y+oy,z:z+p.oz,node,distanceLabel,avatar,tint,bounds:bodyBounds,
          lineColor:visual.className.includes('bot')?'rgb(255,255,255)':visual.className.startsWith('human')?'rgb(233,55,51)':null,
          boundsExpiresAt:spatialPose?.expiresAt||0,box:visual.box,ray:visual.ray,card:!crate});
      };
      const body=p.selfBody?.i===p.sid&&globalThis.UamRadarAvatar?.pose(p.selfBody,p,lastFrameAt,now)?p.selfBody:null;
      if(byId('d3Self').checked)add(body?body.x:p.sx,body?body.y:p.sy,body?body.z:p.sz,{className:'self',name:'自己',model:true},body);
      for(const e of p.e)if(e&&[0,1,4].includes(e.tp))add(e.x,e.y,e.z,e.tp===4?crateVisual(e,true):entityVisual(e,p,true),e);
    }
    sceneRenderer.update(context?.point||null,items);
    byId('cameraStatus').hidden=!is3d()||(publicModelPack?!context?.waitingHeight:
      byId('cameraMode').value!=='first'||!!context?.point?.view);
    byId('cameraStatus').textContent=publicModelPack?'等待带高度的雷达数据…':'等待所选目标的实时视角…';
    byId('avatarStatus').hidden=!is3d();
    byId('retryAvatar').hidden=!is3d()||!byId('showAvatars').checked||!!avatarAsset||avatarBusy||!avatarMessage;
    byId('avatarStatus').textContent=!byId('showAvatars').checked?avatarLabel+'已隐藏':avatarMessage||
      (avatarAsset?avatarLabel+' · '+items.filter(i=>i.avatar).length+' 个目标':'等待'+avatarLabel);
    if(load&&byId('showAvatars').checked)void loadAvatar();
    if(load)void refreshScene();
  }
  function setViewMode(value) {
    if(!['2d','3d','3d-color'].includes(value)||(room&&!publicModelPack)||(publicModelPack&&value==='3d-color')||value===viewMode)return;
    if(value!=='2d'&&!sceneRenderer) {
      sceneRenderer=sceneModel?.create(byId('sceneCanvas'),byId('sceneMarkers'),text=>{avatarAsset=null;avatarRetryAt=0;invalidateScene();sceneStatus(text,true);},byId('sceneDecorations'),text=>{const status=byId('sceneTextureStatus');status.textContent=text;status.hidden=!text||viewMode!=='3d-color';});
      if(!sceneRenderer){viewMode='3d';sceneStatus(byId('sceneStatus').textContent||'3D 组件不可用，请刷新页面',true);viewMode='2d';byId('viewMode').value='2d';return;}
      if(publicModelPack&&(preview||manualMapId)&&publicModelPack.maps.some(item=>item.id===selected?.id)){
        byId('sceneMapSelect').value=selected.id;
      }
    }
    viewMode=value;byId('viewMode').value=value;byId('map').hidden=value!=='2d';byId('sceneView').hidden=value==='2d';
    byId('avatarControl').hidden=value==='2d';byId('avatarStatus').hidden=value==='2d';byId('retryAvatar').hidden=true;
    byId('targets2d').hidden=value!=='2d';byId('targets3d').hidden=value==='2d';
    byId('cameraControls').hidden=value==='2d'||!!publicModelPack;byId('cameraStatus').hidden=true;
    byId('floorSelect').disabled=value!=='2d'||!atlas;byId('fitMap').disabled=value!=='2d'?false:!bounds;
    byId('fitMap').title=value!=='2d'?'显示完整 3D 地图':'将当前楼层完整显示在可见区域';
    byId('fitLabel').textContent='全图';byId('annotationControls').hidden=value!=='2d';byId('followScene').hidden=value==='2d';
    if(value==='2d')byId('captionName').textContent=selectedFloor?.name||'';
    if(publicModelPack){
      byId('previewMapControls').hidden=value!=='2d';
      byId('sceneMapControls').hidden=value==='2d';
      byId('floorLabel').hidden=value!=='2d';
      byId('floorSelect').hidden=value!=='2d';
      if(value==='2d'){byId('mapName').textContent=selected?.name||'等待地图';updateMapSelection();}
    }
    byId('sceneStatus').hidden=value==='2d';byId('retryScene').hidden=true;
    ++sceneGeneration;sceneAbort?.abort();sceneAbort=null;sceneBusy=false;clearTimeout(sceneRetry);nextSceneFetch=0;
    byId('sceneTextureStatus').hidden=value!=='3d-color'||!byId('sceneTextureStatus').textContent;
    if(value!=='2d'&&sceneKey&&sceneKey!==sceneContext()?.request.key)invalidateScene();
    sceneRenderer?.setVisible(value!=='2d');
    if(value==='2d')map.invalidateSize({animate:false});
    renderMarkers();sceneRenderer?.resize();
  }
  function disconnected(text) {
    lastPacket=null;followedMapId=0;clearMarkers();byId('connectionDot').classList.remove('live');
    byId('connectionStatus').textContent=text;updateFrameStatus();
    updateFollow();if(is3d())renderScene(false);
  }
  function setViewerCount(count) {
    const valid=Number.isSafeInteger(count)&&count>=0;
    byId('viewerCount').textContent=valid?String(count):'—';
    byId('viewerPresence').classList.toggle('live',valid);
  }
  function syncRoomCatalog(packet) {
    if(!room)return;
    if(mapPackLoader){
      const region=requiredPackRegion(packet);
      if(mapPackRequest&&mapPackRequest.region!==region){
        mapPackRequest.controller.abort();mapPackRequest=null;
        if(mapPack?.catalog.region===region)setMapStatus('');
      }
      if(failedPackRegion&&failedPackRegion!==region){
        failedPackRegion='';
        if(mapPack?.catalog.region===region)setMapStatus('');
      }
      if(!mapPackRequest&&failedPackRegion!==region&&mapPack?.catalog.region!==region)void loadMapPack(region);
      return;
    }
    if(packet.atlasReady===false&&atlas){
      ++catalogGeneration;catalogLoading=false;atlasRevision='';clearCatalog();
      byId('mapName').textContent='等待地图';byId('captionName').textContent='';
      setMapStatus('等待手机同步地图…');clearTimeout(catalogRetry);catalogRetry=setTimeout(()=>{void loadCatalog();},5000);
    }
    if(packet.atlasReady&&packet.atlasRevision!==atlasRevision&&!catalogLoading)void loadCatalog();
  }
  function connect() {
    stream?.close();clearInterval(connectionTimer);
    setViewerCount(null);
    if(preview){disconnected('地图预览');return;}
    if(room&&!/^\d{4}$/.test(room)){disconnected('房间号无效，应为四位数字');return;}
    disconnected('连接中…');stream=new RadarPages.Stream(room?'/data?room='+room:'/data');
    stream.onopen=()=>disconnected('等待对局');
    stream.addEventListener('viewers',event=>{
      let presence;try{presence=JSON.parse(event.data);}catch(_){setViewerCount(null);return;}
      if(!room||presence?.game!=='uam-mobile'||presence.room!==room){setViewerCount(null);return;}
      setViewerCount(presence.count);
    });
    stream.onmessage=event=>{
      let packet;try{packet=JSON.parse(event.data);}catch(_){disconnected('数据无效，等待更新');return;}
      if(!packet||packet.game!=='uam-mobile'||!Array.isArray(packet.e)||(room&&packet.room!==room)) {
        disconnected('数据来源不匹配');return;
      }
      if(room&&packet.expired){setViewerCount(null);stream.close();location.assign('./?room='+room);return;}
      lastFrameAt=performance.now();lastPacket=packet;byId('connectionDot').classList.add('live');
      byId('connectionStatus').textContent=packet.active===true?'已连接':'等待对局';
      if(packet.active!==true)followedMapId=0;
      syncRoomCatalog(packet);
      followMap();updateFrameStatus();
      renderMarkers();
    };
    stream.onerror=()=>{setViewerCount(null);disconnected('断线重连中…');};
    connectionTimer=setInterval(()=>{if(lastPacket?.active===true&&performance.now()-lastFrameAt>2500)disconnected('数据过期，等待更新');},500);
  }
  if(!globalThis.L||!projection||!annotationModel){setMapStatus('地图组件加载失败，请刷新页面。',true);return;}
  map=L.map('map',{crs:L.CRS.Simple,minZoom:-5,maxZoom:3,zoomSnap:0.25,zoomControl:false,attributionControl:false,zoomAnimation:false});
  map.createPane('mapAnnotations').style.zIndex='450';
  map.createPane('radarLive').style.zIndex='500';
  L.control.zoom({position:'topright'}).addTo(map);
  map.on('zoomend',renderAnnotations);
  map.on('dragstart',()=>{follow2d=false;});
  map.on('click',event=>{
    if(!selectedFloor||!bounds)return;
    const point=projection.unproject(selectedFloor.projection,event.latlng.lng/selectedFloor.width,1-event.latlng.lat/selectedFloor.height);
    if(point) {
      byId('coordinateStatus').textContent='X '+point.x.toFixed(1)+' · Y '+point.y.toFixed(1);
      byId('coordinateStatus').hidden=false;
    }
  });
  byId('mapSelect').addEventListener('change',event=>{
    const id=event.target.value;if(!atlas||(!maps.some(item=>item.id===id)&&(preview||id!=='auto')))return;
    if(preview)selectMap(id);
    else if(id==='auto'){manualMapId='';followedMapId=0;followMap();updateMapSelection();}
    else {manualMapId=id;selectMap(id);}
    updateFrameStatus();renderMarkers();
  });
  if(publicModelPack){
    options('sceneMapSelect',preview?publicModelPack.maps:[{id:'auto',name:'跟随当前对局'},...publicModelPack.maps]);
    byId('sceneMapSelect').value=preview?publicModelPack.maps[0].id:'auto';
    byId('sceneMapSelect').addEventListener('change',()=>{
      invalidateScene();sceneRenderer?.follow();renderMarkers();
    });
  }
  byId('floorSelect').addEventListener('change',event=>{void selectFloor(event.target.value);});
  byId('fitMap').addEventListener('click',()=>{follow2d=false;if(is3d()){byId('cameraMode').value='third';byId('cameraStatus').hidden=true;sceneRenderer?.fit();}fit();});
  byId('cameraMode').value='third';
  byId('cameraMode').addEventListener('change',event=>{sceneRenderer?.setPerspective(event.target.value);renderScene(false);});
  byId('followScene').addEventListener('click',()=>{sceneRenderer?.follow();renderMarkers();});
  byId('viewMode').addEventListener('change',event=>setViewMode(event.target.value));
  byId('followSelect').addEventListener('change',event=>{
    const id=event.target.value;if(id!=='self'&&!teammates().some(e=>e.i===id))return;
    followId=id;follow2d=true;byId('followStatus').hidden=true;
    sceneRenderer?.follow();renderMarkers();
  });
  byId('retryScene').addEventListener('click',()=>{invalidateScene();void refreshScene(true);void loadAvatar(true);});
  byId('retryAvatar').addEventListener('click',()=>{void loadAvatar(true);});
  for(const key of displayKeys)byId(key).addEventListener('change',()=>{
    saveDisplay();if(key==='showNames'||key==='showExits')renderAnnotations();else renderMarkers();
  });
  for(const key of display3dKeys)byId(key).addEventListener('change',()=>{saveDisplay3d();if(is3d())renderMarkers();});
  byId('retryMap').addEventListener('click',()=>{
    if(mapPackLoader){
      const region=requiredPackRegion(lastPacket);
      if(mapPack?.catalog.region===region&&selectedFloor)void selectFloor(selectedFloor.id);
      else void loadMapPack(region);
    }else void loadCatalog();
  });
  function setPanel(open) {
    byId('panel').hidden=!open;byId('menuToggle').setAttribute('aria-expanded',String(open));
    fit();
  }
  function selectPanelTab(name) {
    for(const tab of ['map','targets']) {
      const selected=tab===name;
      byId(tab+'Tab').setAttribute('aria-selected',String(selected));
      byId(tab+'Tab').tabIndex=selected?0:-1;
      byId(tab+'Controls').hidden=!selected;
    }
  }
  byId('menuToggle').addEventListener('click',()=>setPanel(byId('panel').hidden));
  byId('panelClose').addEventListener('click',()=>{
    setPanel(false);byId('menuToggle').focus();
  });
  for(const name of ['map','targets']) {
    byId(name+'Tab').addEventListener('click',()=>selectPanelTab(name));
    byId(name+'Tab').addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const next=event.key==='Home'?'map':event.key==='End'?'targets':name==='map'?'targets':'map';
      selectPanelTab(next);byId(next+'Tab').focus();
    });
  }
  selectPanelTab('map');
  let sceneTimer=setInterval(()=>{if(is3d())void refreshScene();},250);
  addEventListener('resize',()=>{fit();sceneRenderer?.resize();});
  addEventListener('pagehide',()=>{
    mapPackRequest?.controller.abort();mapPackRequest=null;
    setViewerCount(null);stream?.close();clearInterval(connectionTimer);clearTimeout(catalogRetry);clearInterval(sceneTimer);invalidateScene();sceneRenderer?.setVisible(false);
  });
  addEventListener('pageshow',event=>{if(event.persisted){connect();if(mapPackLoader)void loadMapPack();sceneRenderer?.setVisible(is3d());clearInterval(sceneTimer);sceneTimer=setInterval(()=>{if(is3d())void refreshScene();},250);}});
  connect();
  if(mapPackLoader)void loadMapPack();
  else void loadCatalog();
})();
