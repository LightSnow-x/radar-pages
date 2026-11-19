export const defaults={humans:true,bots:true,names:true,distances:true,healthRing:true,weapons:false,ids:false,self:true,pointSize:10};
export function radarRoute(pathname){const cloud=/^\/codm(?:\/|$)/.test(pathname),room=pathname.match(/^\/codm\/(\d{4})$/)?.[1]||'';return {cloud,room,frameUrl:cloud?'/codm/frame.json?room='+room:'/frame.json'};}
export function validFrame(frame){return !!frame&&frame.schema===1&&typeof frame.ready==='boolean'&&Number.isInteger(frame.mapId)&&Array.isArray(frame.players);}
export function visibleTargets(frame,settings){if(!validFrame(frame)||!frame.ready)return [];return frame.players.filter(p=>p&&typeof p.bot==='boolean'&&(p.bot?settings.bots:settings.humans)&&Number.isFinite(p.position?.u)&&Number.isFinite(p.position?.v)&&p.health>0);}
export function markerPoint(position,size,origin){return {x:origin.x+position.u*size,y:origin.y+position.v*size};}
export function visibleSelf(frame,settings){const self=frame?.self;return validFrame(frame)&&frame.ready&&settings.self&&Number.isFinite(self?.position?.u)&&Number.isFinite(self?.position?.v)?self:null;}
export function canvasResolution(width,height,pixelRatio){const ratio=Number.isFinite(pixelRatio)&&pixelRatio>0?pixelRatio:1;return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};}
export function loadSettings(storage){let result={...defaults};try{const value=JSON.parse(storage.getItem('codm-lan-radar')||'{}');for(const key of Object.keys(defaults)){if(key==='pointSize')continue;if(typeof value[key]==='boolean')result[key]=value[key];}if(Number.isFinite(value.pointSize))result.pointSize=Math.min(12,Math.max(3,value.pointSize));}catch{}return result;}
export function connectionState(frame,lastPacket,now,paused=false,attempted=false){
 if(paused)return 'paused';
 if(!validFrame(frame)||lastPacket===null||now-lastPacket>1000)return attempted?'offline':'connecting';
 return frame.ready?'live':'waiting';
}
export function countTargets(frame){const counts={humans:0,bots:0};for(const player of visibleTargets(frame,defaults))counts[player.bot?'bots':'humans']++;return counts;}
// Match the UAM web radar's health ring and marker proportions.
export function healthColor(fraction){return fraction>.6?'#00ff00':fraction>.3?'#ffff00':'#ff0000';}
export function healthFraction(health,maximum){return Number.isFinite(health)&&health>=0&&Number.isFinite(maximum)&&maximum>0?Math.min(1,health/maximum):null;}
export function targetMarkerStyle(player,settings){
 const radius=settings.pointSize*(player.bot ? .85 : 1),ratio=settings.healthRing?healthFraction(player.health,player.maxHealth):null;
 return {radius,color:player.bot?'#ffffff':'#ff5050',team:Number.isInteger(player.teamId)&&player.teamId>0?String(player.teamId):'',
  ratio,ringRadius:settings.pointSize*1.35,ringWidth:settings.pointSize*.2,extent:ratio===null?radius:settings.pointSize*1.45};
}
export function loadMenuCollapsed(storage,compact=false){try{const value=JSON.parse(storage.getItem('codm-lan-radar-menu-collapsed'));if(typeof value==='boolean')return value;}catch{}return compact;}

// Chinese display strings verified from CODM CN 1.9.57 LanguagePack_zh_CN,
// joined through MapConfig.LOCID_Name. Scene identifiers remain transport data.
const mapNames=new Map([
 ["LOC_MAPCONF_CROSSFIRE","交叉火力"],
 ["LOC_MAPCONF_STANDOFF","战火小镇"],
 ["LOC_MAPCONF_CRASH","坠机之地"],
 ["LOC_MAPCONF_TUNISIA","突尼斯"],
 ["LOC_MAPCONF_FIRINGRANGE","枪火战区"],
 ["LOC_MAPCONF_RAID","山景别墅"],
 ["LOC_MAPCONF_MELTDOWN","熔炉工厂"],
 ["LOC_MAPCONF_TAKEOFF","发射基地"],
 ["LOC_MAPCONF_STANDOFF_HALLOWEEN","战火小镇-南瓜狂欢"],
 ["LOC_MAPCONF_SUMMIT","雪山之巅"],
 ["LOC_MAPCONF_SCRAPYARD","废料场"],
 ["LOC_MAPCONF_RAID_XMAS","山景别墅-冬日"],
 ["LOC_MAPCONF_HIGHRISE","高楼"],
 ["LOC_MAPCONF_TERMINAL","航站楼"],
 ["LOC_MAPCONF_MP_HACKNEYYARD","哈肯后院"],
 ["LOC_MAPCONF_MP_COASTAL","滨海酒镇"],
 ["LOC_MAPCONF_MP_SATELLITE","卫星"],
 ["LOC_MAPCONF_MP_DOME","雷达站"],
 ["LOC_MAPCONF_MP_SUDAL_HARBOR","索达尔港"],
 ["LOC_MAPCONF_MP_SLUMS","残破街区"],
 ["LOC_MAPCONF_SCRAPYARD_MW","废料场-现代"],
 ["LOC_MAPCONF_MP_VILLAGE","锯木厂"],
 ["LOC_MAPCONF_MP_VACANT","废弃办公室"],
 ["LOC_MAPCONF_MP_ICEBREAKER","破冰船"],
 ["LOC_MAPCONF_MP_HACIENDA","庄园"],
 ["LOC_MAPCONF_MP_HARDHAT","商业园区工地"],
 ["LOC_MAPCONF_MP_HIDEOUT","坎杜尔藏身处"],
 ["LOC_MAPCONF_MP_APOCALYPSE","深林遗迹"],
 ["LOC_MAPCONF_MP_FAVELA","贫民窟"],
 ["LOC_MAPCONF_MP_EXPRESS","高铁站"],
 ["LOC_MAPCONF_MP_HACIENDA_HALLOWEEN","庄园-南瓜狂欢"],
 ["LOC_MAPCONF_MP_KUROHANA_METROPOLIS","黑花都市"],
 ["LOC_MAPCONF_MP_CROSSROADS STRIKE","十字路口突袭"],
 ["LOC_MAPCONF_MP_DIESEL","柴油站"],
 ["LOC_MAPCONF_MP_RUSH","冲锋"],
 ["LOC_MAPCONF_MP_ARSENAL","军械库"],
 ["LOC_MAPCONF_MP_ARMADA_STRIKE","舰队突袭"],
 ["LOC_MAPCONF_MP_SEASIDE","海韵小镇"],
 ["LOC_MAPCONF_MP_GARDEN","柴郡公园"],
 ["LOC_MAPCONF_MP_FREQUENCY","谐波林壁"],
 ["LOC_MAPCONF_MP_COMBINE","生态圈"],
 ["LOC_MAPCONF_MP_COLLATERAL_STRIKE","尘沙风暴突袭"],
 ["LOC_MAPCONF_MP_ZOO","动物园"],
 ["LOC_MAPCONF_RUST","荒漠油厂"],
 ["LOC_MAPCONF_KILLHOUSE","战斗小屋"],
 ["LOC_MAPCONF_HIJACKED","激战游艇"],
 ["LOC_MAPCONF_NUKETOWN","核弹小镇"],
 ["LOC_MAPCONF_MONASTERY","修道院"],
 ["LOC_MAPCONF_MP_RUSSIAN_NUKETOWN","核弹小镇-远东"],
 ["LOC_MAPCONF_MP_SHOOTHOUSE","攻坚训练场"],
 ["LOC_MAPCONF_MP_SHIPMENT_MW","装卸货场-现代"],
 ["LOC_MAPCONF_MP_CHINESE_NUKETOWN","核弹小镇-兔年新春"],
 ["LOC_MAPCONF_MP_MIAMI_STRIKE","迈阿密突袭"],
 ["LOC_MAPCONF_MP_MIAMI_HOLIDAY","迈阿密-冬日"],
 ["LOC_MAPCONF_MP_CHINESE_LONG_NUKETOWN","核弹小镇-龙影华城"],
 ["LOC_MAPCONF_CAGE","建筑工地"],
 ["LOC_MAPCONF_REBIRTH","重生"],
 ["LOC_MAPCONF_MP_SHIPMENT","装卸货场"],
 ["LOC_MAPCONF_MP_SHIPMENT_CN","装卸货场-鸿运"],
 ["LOC_MAPCONF_MIDEAST","绿洲"],
 ["LOC_MAPCONF_HELLSTORM_DEF","导弹防御"],
 ["LOC_MAPCONF_HELLSTORM_FLY","地狱风暴"],
 ["LOC_MAPCONF_UAV_DEFEND","无人机守卫"],
 ["LOC_MAPCONF_UAV_DESTROY","无人机清除"],
 ["LOC_MAPCONF_CAPTURE_DOM","精确射击（正常）"],
 ["LOC_MAPCONF_DEFEND_DOM","守卫控制"],
 ["LOC_MAPCONF_FREE_FRAG_EASY","跑动扔雷训练"],
 ["LOC_MAPCONF_AR_ASSAULT_NORMAL","步枪训练"],
 ["LOC_MAPCONF_FREE_FRAG_NORMAL","跑动扔雷训练"],
 ["LOC_MAPCONF_PRESET_FRAG_EASY","定点扔雷训练"],
 ["LOC_MAPCONF_PRESET_FRAG_NORMAL","定点扔雷训练"],
 ["LOC_MAPCONF_PRESET_FRAG_HARD","定点扔雷训练"],
 ["LOC_MAPCONF_FREE_FRAG_HARD","跑动扔雷训练"],
 ["LOC_MAPCONF_AR_ASSAULT_HARD","步枪训练"],
 ["LOC_MAPCONF_AR_ASSAULT_EASY","步枪训练"],
 ["LOC_MAPCONF_HELLSTORM_DEF_EASY","雷达搜索练习"],
 ["LOC_MAPCONF_HELLSTORM_DEF_HARD","导弹命中练习"],
 ["LOC_MAPCONF_UAV_DEFEND_EASY","雷达搜索练习"],
 ["LOC_MAPCONF_UAV_DEFEND_HARD","雷达搜索练习"],
 ["LOC_MAPCONF_UAV_DESTROY_EASY","雷达搜索练习"],
 ["LOC_MAPCONF_UAV_DESTROY_HARD","雷达搜索练习"],
 ["LOC_MAPCONF_BIG_HITS","火焰控制"],
 ["LOC_MAPCONF_MISSILETURN_EASY","导弹防御"],
 ["LOC_MAPCONF_MISSILETURN_NORMAL","导弹防御"],
 ["LOC_MAPCONF_MISSILETURN_HARD","导弹防御"],
 ["LOC_MAPCONF_ANIYAHPALACE","阿尼亚禁区"],
 ["LOC_MAPCONF_PINE","松林靶场"],
 ["LOC_MAPCONF_KING","王者"],
 ["LOC_MAPCONF_BR_ISLAND","海岛"],
 ["LOC_MAPCONF_BR_CHERLOBYL","切尔诺贝利"],
 ["LOC_MAPCONF_BR_ISOLATED","边境"],
 ["LOC_MAPCONF_BR_ISOLATED_ALLSTAR","硬核生存"],
 ["LOC_MAPCONF_BR_ALCATRAZ","恶魔岛"],
 ["LOC_MAPCONF_BR_BLACKOUT","黑色战域"],
 ["LOC_MAPCONF_BR_PROTOTYPE","原型"],
 ["LOC_MAPCONF_BR_CHERLOBYL_SUNNY","切尔诺贝利阳光"],
 ["LOC_MAPCONF_AIMARENA","正中靶心"],
 ["LOC_MAPCONF_TANKBATTLEGROUND","坦克战场"],
 ["LOC_MAPCONF_MP_ATRIUM","庭院"],
 ["LOC_MAPCONF_SALOON","沙龙"],
 ["LOC_MAPCONF_GULAG","废弃浴室"],
 ["LOC_MAPCONF_MP_DOCKS","码头"],
 ["LOC_MAPCONF_STACK","荒漠靶场"],
 ["LOC_MAPCONF_TRAININGGROUD","训练场"],
 ["LOC_MAPCONF_CRASH_NIGHT","坠机之地-夜晚"],
 ["LOC_MAPCONF_SUMMIT_NIGHT","雪山之巅-夜晚"],
 ["LOC_MAPCONF_MP_HACKNEYYARD_NIGHT","哈克尼仓库-夜晚"],
 ["LOC_MAPCONF_MELTDOWN_FOG","熔炉工厂-浓雾"],
 ["LOC_MAPCONF_MP_CROSSROADS","十字路口"],
 ["LOC_MAPCONF_MP_ARMADA","舰队"],
 ["LOC_MAPCONF_GW_COLLATERAL","尘沙风暴"],
 ["LOC_MAPCONF_PLATFORM","太空转运平台"],
 ["LOC_MAPCONF_ENDLESS_PVE","恶灵沼泽"],
 ["LOC_MAPCONF_GREEN_RUN_FARM","格林卢恩农场"],
 ["LOC_MAPCONF_GREEN_RUN_TOWN","格林卢恩镇"],
 ["LOC_MAPCONF_GREEN_RUN_DINER","格林卢恩餐厅"],
 ["LOC_MAPCONF_GREEN_RUN_POWER_STATION","格林卢恩电站"],
 ["LOC_MAPCONF_GREEN_RUN_BUS_STATION","格林卢恩汽车站"],
 ["LOC_MAPCONF_GREEN_RUN_CORNFIELD","格林卢恩玉米田"],
 ["LOC_MAPCONF_FARM_CHALLENGE","农场挑战"],
 ["LOC_MAPCONF_TOWN_CHALLENGE","农场挑战"],
 ["LOC_MAPCONF_DINER_CHALLENGE","餐厅挑战"],
 ["LOC_MAPCONF_POWER_STATION_CHALLENGE","电站挑战"],
 ["LOC_MAPCONF_BUS_STATION_CHALLENGE","精确射击（困难）"],
 ["LOC_MAPCONF_BRAIN_HUNT","精确射击（简单）"],
 ["LOC_MAPCONF_OUT_OF_AMMO","弹药挑战"],
 ["LOC_MAPCONF_PVE_ULTIMATE_TRY","火焰控制"],
 ["LOC_MAPCONF_NORMAL_PVE","恶灵沼泽"],
 ["LOC_MAPCONF_HARD_PVE","恶灵沼泽"],
 ["LOC_MAPCONF_TUTORIAL_SHINONUMA","恶灵沼泽"],
 ["LOC_MAPCONF_NIGHTOFUNDEAD","亡者之夜"],
 ["LOC_MAPCONF_SNIPER_TRAINING","狙击训练"],
 ["LOC_MAPCONF_RUSH_TRAINING","闯入训练"],
 ["LOC_MAPCONF_SNIPER_CHALLENGE","狙击挑战"],
 ["LOC_MAPCONF_RUSH_CHALLENGE","闯入挑战"],
 ["LOC_MAPCONF_PROLOGUE","序章"],
 ["LOC_MAPCONF_TUTORIAL","教程"],
 ["LOC_MAPCONF_UGC_TEMPLATE_BR","吃鸡模板"],
 ["LOC_MAPCONF_UGC_TEMPLATE_VISIT","个人游玩模板"],
 ["LOC_MAPCONF_UGC_TEMPLATE_PARKOUR","跑酷模板"],
 ["LOC_MAPCONF_UGC_TEMPLATE_FTL","冲突团竞模板"],
 ["LOC_MAPCONF_UGC_TEMPLATE_SD","爆破模板"],
 ["LOC_MAPCONF_UGC_TEMPLATE_FFA","个人竞技模板"],
 ["LOC_MAPCONF_UGC_TEMPLATE_DOM","据点模板"],
 ["LOC_MAPCONF_BR_TDM","边境"],
 ["LOC_MAPCONF_BR_TDM_ALCATRAZ","大战场团队竞技-恶魔岛"],
 ["LOC_MAPCONF_BR_WARFARE_BLACKOUT","黑色战域"],
 ["LOC_MAPCONF_BR_SNIPER_BLACKOUT","黑色战域"],
 ["LOC_MAPCONF_BR_LTM3","限时模式"],
 ["LOC_MAPCONF_BR_ALCATRAZ_40","恶魔岛"],
 ["LOC_MAPCONF_BR_KRAI","克莱格勒"],
 ["LOC_MAPCONF_BR_REBIRTHISLAND","重生岛"],
 ["LOC_MAPCONF_BR_LTM4","限时模式"],
 ["LOC_MAPCONF_BR_12V12_ALCATRAZ","大战场团队竞技-恶魔岛"],
 ["LOC_MAPCONF_TRAININGLEVEL","战场训练场"],
 ["LOC_MAPCONF_BR_NEWHORIZON","边境"],
 ["LOC_MAPCONF_BR_VERDANSK","福尔丹斯克"],
 ["LOC_MAPCONF_BR_BLITZ","边境"],
 ["LOC_MAPCONF_BR_BLITZ_BLACKOUT","黑色战域"],
 ["LOC_MAPCONF_BR_ISOLATED_TANK_BATTLE","边境"],
 ["LOC_MAPCONF_BR_PROPSHUNT_ISOLATED","边境"],
 ["LOC_MAPCONF_TRAININGBASE","训练基地"],
 ["LOC_MAPCONF_BR_BLACKOUT_CAMPAIGN","单人战役"],
 ["LOC_MAPCONF_BR_SAVEISOLATED","拯救边境"],
 ["LOC_MAPCONF_BR_GW","边境"],
 ["LOC_BRGAME_MAPMARK_NUKETOWN","幻景市"],
 ["LOC_BRGAME_MAPMARK_FIRINGRANGE","生态实验室"],
 ["LOC_BRPLAYLISTCONF_MODE_ARENA_NEW_VISION_CITY","竞技场-幻景市"],
 ["LOC_BRPLAYLISTCONF_MODE_ARENA_LABORATORY","竞技场-生态实验室"],
 ["LOC_MAPCONF_BR_ISOLATED_RYBG_INTRO","边境-异变暗域"],
 ["LOC_MAPCONF_BR_ISOLATED_RYBG","边境-异变暗域"],
 ["LOC_MAPCONF_SPEEDRUN","追逐猎场"],
 ["LOC_MAPCONF_SPEEDRUNBO3","战墟奔袭"],
 ["LOC_MAPCONF_BR_CM","边境"],
 ["LOC_MAPCONF_BR_CM_EVENT","边境"],
 ["LOC_BRPLAYLISTCONF_MODE_NAME_AZURCAMPAIGN","直入虎穴"],
 ["LOC_MAPCONF_BR_URALS_EVENT","蛛丝马迹"],
 ["LOC_MAPCONF_BR_KNOWYOURHISTORY","福尔丹斯克"],
 ["LOC_MAPCONF_SOLDIERBAR","士兵酒吧"],
 ["LOC_MAPCONF_GW_BREAKTHROUGH_AZUR","米摩诺斯岛"],
 ["LOC_MAPCONF_DMZ_SNAKE_TRAIN","训练场"],
 ["LOC_MAPCONF_DMZ_GYM","DMZ: 禁区 - 自建房"],
 ["LOC_MAPCONF_DMZ_SNAKE","蛇隐岛"],
 ["LOC_MAPCONF_DMZ_SNAKE_FASTMODE","蛇隐岛-快速模式"],
 ["LOC_MAPCONF_DMZ_SNAKE_TUTORIAL","新手训练"],
 ["LOC_MAPCONF_DMZ_SANCHI","21号楼"],
 ["LOC_MAPCONF_RCRACINGDESSERTSOLO","沙漠竞速赛"],
 ["LOC_MAPCONF_RCRACINGSNOWSOLO","雪地竞速赛"],
 ["LOC_MAPCONF_RCRACINGDESERTDUAL","沙漠跑道赛"],
 ["LOC_MAPCONF_RCRACINGSNOWDUAL","雪地跑道赛"],
 ["LOC_MAPCONF_BR_ARMOREDROYALE","装甲突围"],
 ["LOC_MAPCONF_DMZ_REBIRTHISLAND","重生岛"],
 ["LOC_MAPCONF_DMZ_VERDANSK","福尔丹斯克"],
 ["LOC_MAPCONF_NUKETOWN_ARCADE","核弹小镇"],
 ["LOC_MAPCONF_SHIPMENT_MW_ARCADE","装卸货场"]
]);
const mapCodeNames=new Map([...mapNames].filter(([key])=>key.startsWith('LOC_MAPCONF_')).map(([key,name])=>[key.replace(/^LOC_MAPCONF_(?:MP_)?/,'').replace(/[ _-]/g,''),name]));
const mapModeTokens=new Set('MP SD TDM DOM FTL KC HP FFA HQ CTF GF GUNGAME URF MLK CRANKED CRANK FB ESD SAS INF INF10V10 TDM10V10 DOM10V10 KC10V10 CONTROL CHAOS SRSD SNP DUEL PH CSAS SPSD 3V3GF SG CHAMBER SHOOTOUT HEIST PSD BIGHEAD PL PVA HC RUNTIME'.split(' '));
export function mapDisplayName(frame){
 const title=mapNames.get(typeof frame?.mapNameKey==='string'?frame.mapNameKey.toUpperCase():'');if(title)return title;
 const name=typeof frame?.mapName==='string'?frame.mapName.trim():'';
 if(/[\u3400-\u9fff]/.test(name)&&!name.includes('_'))return name;
 const code=name.toUpperCase().split('_').filter(part=>!mapModeTokens.has(part)).join('').replace(/[ -]/g,'');
 return mapCodeNames.get(code)||(frame?.mapId?'当前地图':'等待地图');
}


if(typeof document!=='undefined')start();
function start(){
 const byId=id=>document.getElementById(id),canvas=byId('radar'),ctx=canvas.getContext('2d');
 const route=radarRoute(RadarPages.route);let joining=false,joinError='';
 if(route.cloud){
  document.title='CODM 云端共享雷达';
  byId('cloud-room-entry').hidden=!!route.room;
  byId('cloud-room').value=route.room||new URLSearchParams(location.search).get('room')?.replace(/\D/g,'').slice(0,4)||'';
  document.querySelector('.access-top span').textContent='云端共享 · CODM';
  document.querySelector('.access-content>.eyebrow').textContent='CLOUD RADAR';
  document.querySelector('.access-intro').textContent='输入手机端设置的四位房间号，跨网络查看当前对局。';
  document.querySelector('.access-note p').textContent='在 CODM 的「雷达 → 共享雷达」开启云端共享。房间号请分享给需要观看的人。';
  document.querySelector('.access-footer span').textContent='CODM 云端雷达 · 加密连接';
  document.querySelector('.brand strong').textContent='云端共享雷达';
  if(!route.room)document.querySelector('.device-box').hidden=true;
  byId('cloud-room').addEventListener('input',()=>{byId('cloud-room').value=byId('cloud-room').value.replace(/\D/g,'').slice(0,4);joinError='';});
  byId('cloud-room').addEventListener('keydown',event=>{if(event.key==='Enter'&&!byId('enter-radar').disabled)byId('enter-radar').click();});
 }
 const markerRoot=byId('radar-markers'),targetRoot=byId('target-markers'),selfMarker=byId('self-marker'),markerNodes=new Map();
 let markerGeneration=0,pixelRatio=0;
 function targetDot(player,point,style){
  const key=String(player.id)+':'+String(player.actorId??'');let marker=markerNodes.get(key);
  if(!marker){
   const part=(parent,tag,attributes)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [name,value] of Object.entries(attributes))node.setAttribute(name,value);parent.append(node);return node;};
   const node=part(targetRoot,'g',{}),ring=part(node,'g',{'fill':'none'});
   const track=part(ring,'circle',{'stroke':'rgba(0,0,0,.43)'});
   const health=part(ring,'circle',{'transform':'rotate(-90)','pathLength':'100','stroke-linecap':'butt'});
   const dot=part(node,'circle',{'stroke':'#000d','stroke-width':'1.5'});
   const team=part(node,'text',{'text-anchor':'middle','dominant-baseline':'central','fill':'#141414','font-family':'system-ui,sans-serif','font-weight':'800'});
   marker={node,ring,track,health,dot,team,generation:0};markerNodes.set(key,marker);
  }
  marker.generation=markerGeneration;
  marker.node.setAttribute('transform',`translate(${point.x} ${point.y})`);
  marker.dot.setAttribute('r',String(Math.max(1,style.radius-.75)));marker.dot.setAttribute('fill',style.color);
  marker.team.textContent=style.team;
  marker.team.setAttribute('font-size',String(Math.min(settings.pointSize,style.radius*2/Math.max(1,style.team.length))));
  marker.ring.setAttribute('display',style.ratio===null?'none':'inline');
  if(style.ratio!==null){
   marker.track.setAttribute('r',String(style.ringRadius));marker.health.setAttribute('r',String(style.ringRadius));
   marker.ring.setAttribute('stroke-width',String(style.ringWidth));marker.health.setAttribute('stroke',healthColor(style.ratio));
   marker.health.setAttribute('stroke-dasharray',`${style.ratio*100} 100`);
   marker.ring.setAttribute('aria-label','血量 '+Math.round(style.ratio*100)+'%');
  }
 }
 function finishMarkers(self,size,origin){
  for(const [key,marker] of markerNodes)if(marker.generation!==markerGeneration){marker.node.remove();markerNodes.delete(key);}
  selfMarker.setAttribute('display',self?'inline':'none');
  if(self){const point=markerPoint(self.position,size,origin),radius=Math.max(4,settings.pointSize*.6);
   selfMarker.setAttribute('transform',`translate(${point.x} ${point.y})`);
   byId('self-marker-dot').setAttribute('r',String(radius-.75));
   byId('self-marker-label').setAttribute('y',String(-radius-8));
  }
 }
 let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{}};}
 const settings=loadSettings(storage);let frame=null,image=null,imageRequest='',imageRetry=0,mapKey='',lastPacket=null,lastPoll=-Infinity,inFlight=false,paused=false,width=0,height=0,zoom=1,pan={x:0,y:0},drag=null;
 let entered=false,attempted=false,lastUi=-Infinity,latency=0;
 let menuCollapsed=loadMenuCollapsed(storage,window.matchMedia('(max-width:760px)').matches);
 function updateMenu(){
  byId('radar-layout').classList.toggle('menu-collapsed',menuCollapsed);
  byId('radar-sidebar').hidden=menuCollapsed;
  byId('toggle-menu').setAttribute('aria-expanded',String(!menuCollapsed));
  byId('menu-label').textContent=menuCollapsed?'展开菜单':'收起菜单';
 }
 function toggleMenu(){menuCollapsed=!menuCollapsed;updateMenu();try{storage.setItem('codm-lan-radar-menu-collapsed',JSON.stringify(menuCollapsed));}catch{}}
 byId('toggle-menu').addEventListener('click',toggleMenu);
 byId('radar-sidebar').addEventListener('keydown',event=>{if(event.key==='Escape'&&!menuCollapsed){toggleMenu();byId('toggle-menu').focus({preventScroll:true});}});
 updateMenu();
 byId('device-address').textContent=location.host;
 byId('workspace-address').textContent=route.cloud?location.host+'/codm/ · 房间 '+route.room:location.host+' · 局域网直连';
 for(const key of Object.keys(defaults)){if(key==='pointSize')continue;const input=byId(key);input.checked=settings[key];input.addEventListener('change',()=>{settings[key]=input.checked;save();});}
 byId('point-size').value=String(settings.pointSize);byId('point-size-value').textContent=settings.pointSize+' px';
 byId('point-size').addEventListener('input',event=>{settings.pointSize=Number(event.target.value);byId('point-size-value').textContent=settings.pointSize+' px';save();});
 function save(){try{storage.setItem('codm-lan-radar',JSON.stringify(settings));}catch{}}
 byId('reset-view').addEventListener('click',()=>{zoom=1;pan={x:0,y:0};});
 const setZoom=value=>{zoom=Math.min(6,Math.max(.6,value));};
 byId('zoom-in').addEventListener('click',()=>setZoom(zoom*1.2));
 byId('zoom-out').addEventListener('click',()=>setZoom(zoom/1.2));
 byId('pause').addEventListener('click',()=>{paused=!paused;if(!paused){lastPacket=null;frame=null;lastPoll=-Infinity;}lastUi=-Infinity;});
 function showWorkspace(show){
  entered=show;paused=false;lastPoll=-Infinity;lastUi=-Infinity;
  byId('gateway').hidden=show;byId('workspace').hidden=!show;
  if(show){resize();byId('map-name').focus({preventScroll:true});}
  else{frame=null;lastPacket=null;attempted=false;byId('enter-radar').disabled=true;byId('enter-radar').focus();}
 }
 byId('enter-radar').addEventListener('click',async()=>{
  if(byId('enter-radar').disabled)return;
  if(route.cloud&&!route.room){
   joining=true;joinError='';const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
   try{const response=await fetch('/codm/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room:byId('cloud-room').value}),signal:controller.signal});const data=await response.json();
    if(response.ok&&/^\/codm\/\d{4}#view=radar$/.test(data.location)){location.assign(data.location);return;}joinError=data.error||'连接失败，请稍后重试。';
   }catch{joinError='无法连接服务器，请检查网络后重试。';}finally{clearTimeout(timer);joining=false;}return;
  }
  history.pushState(null,'','#view=radar');showWorkspace(true);
 });
 byId('exit-radar').addEventListener('click',()=>{if(route.cloud){location.assign('./');return;}history.pushState(null,'',location.pathname+location.search);showWorkspace(false);});
 window.addEventListener('popstate',()=>showWorkspace(location.hash==='#view=radar'));
 function resize(){const rect=canvas.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;pixelRatio=devicePixelRatio||1;width=rect.width;height=rect.height;const resolution=canvasResolution(width,height,pixelRatio);canvas.width=resolution.width;canvas.height=resolution.height;ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);}
 new ResizeObserver(resize).observe(canvas);resize();
 const pointers=new Map();let pinch=null;
 canvas.addEventListener('pointerdown',event=>{canvas.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});drag={x:event.clientX,y:event.clientY};if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};}});
 canvas.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()];zoom=Math.min(6,Math.max(.6,pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance)));return;}if(drag){pan.x+=event.clientX-drag.x;pan.y+=event.clientY-drag.y;drag={x:event.clientX,y:event.clientY};}});
 const release=event=>{pointers.delete(event.pointerId);drag=null;pinch=null;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
 canvas.addEventListener('wheel',event=>{event.preventDefault();zoom=Math.min(6,Math.max(.6,zoom*Math.exp(-event.deltaY*.001)));},{passive:false});
 async function poll(now){if((route.cloud&&!route.room)||inFlight||now-lastPoll<(entered?(route.cloud?100:50):500))return;inFlight=true;lastPoll=now;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1800);
  try{const response=await RadarPages.fetch(route.frameUrl,{cache:'no-store',signal:controller.signal});attempted=true;if(response.status===401&&route.cloud){location.replace('./?room='+route.room+'&expired=1');return;}if(!response.ok){lastPoll=performance.now()+300;return;}const next=await response.json();if(!validFrame(next)){lastPoll=performance.now()+300;return;}if(paused)return;
   const key=String(next.attachment||'')+':'+next.mapId;
   if(mapKey!==key){mapKey=key;image=null;imageRequest='';imageRetry=0;zoom=1;pan={x:0,y:0};}
   frame=next;lastPacket=performance.now();latency=Math.round(lastPacket-now);
   if(entered&&!image&&next.mapImage&&imageRequest!==key&&performance.now()>=imageRetry){imageRequest=key;const candidate=new Image();candidate.onload=()=>{if(mapKey===key){image=candidate;imageRequest='';imageRetry=0;}};candidate.onerror=()=>{if(mapKey===key){imageRequest='';imageRetry=performance.now()+1000;}};RadarPages.setImage(candidate,next.mapImage+'&attachment='+encodeURIComponent(next.attachment||''));}
  }catch{attempted=true;if(!paused&&(lastPacket===null||performance.now()-lastPacket>1000))frame=null;lastPoll=performance.now()+300;}finally{clearTimeout(timer);inFlight=false;}}
 function updateUi(now,state,usable){
  if(now-lastUi<100)return;lastUi=now;
  const connected=state==='live'||state==='waiting';
  const tone=state==='connecting'?'waiting':state;
  byId('connection').dataset.tone=tone;
  byId('connection-text').textContent={live:'实时连接',waiting:'已连接 · 等待对局',paused:'显示已暂停',connecting:'正在连接',offline:'连接中断'}[state];
  byId('access-state').dataset.tone=connected?'live':tone;
  byId('access-state-text').textContent=connected?'已连接':state==='offline'?'未连接':'正在连接';
  byId('enter-radar').disabled=!connected;
  byId('enter-label').textContent=connected?'进入雷达':state==='offline'?'等待设备连接':'正在连接设备';
  byId('access-map').textContent=connected?(frame.mapId?mapDisplayName(frame):frame.status||'等待进入对局'):'等待设备响应';
  byId('access-help').textContent=connected?'设备已就绪，可以进入雷达。':state==='offline'?'暂未连接到设备，正在自动重试。':'正在检查雷达服务…';
  if(route.cloud&&!route.room){byId('enter-radar').disabled=joining||!/^\d{4}$/.test(byId('cloud-room').value);byId('enter-label').textContent=joining?'正在进入房间':'进入房间';byId('access-help').textContent=joinError||'支持 0000–9999，手机开启共享后即可进入。';byId('access-help').style.color=joinError?'var(--red)':'';}
  byId('map-name').textContent=mapDisplayName(frame);
  byId('map-detail').textContent='自动跟随当前对局';
  byId('pause-label').textContent=paused?'继续显示':'暂停显示';
  byId('pause-icon').setAttribute('href',paused?'#i-play':'#i-pause');
  byId('pause').setAttribute('aria-pressed',String(paused));
  byId('paused-notice').hidden=!paused;
  byId('pause').disabled=!paused&&!usable;
  byId('zoom-value').textContent=Math.round(zoom*100)+'%';
  byId('status-led').dataset.tone=tone;
  byId('status').textContent=paused?'冻结画面，目标位置不再更新':state==='offline'?'连接中断，已隐藏过期目标':frame?.status||'等待设备响应';
  byId('match-badge').textContent=paused?'已暂停':usable?'对局中':'等待数据';
  byId('sync-detail').textContent=paused?'画面已冻结':connected?'连接响应 '+latency+' ms':'正在自动连接设备';
  const counts=usable?countTargets(frame):null;
  byId('human-count').textContent=counts?String(counts.humans):'—';
  byId('bot-count').textContent=counts?String(counts.bots):'—';
  byId('empty').classList.toggle('hidden',usable&&!!image);
  byId('empty-title').textContent=state==='offline'?'等待重新连接':usable&&!image?(imageRetry?'底图暂不可用':'正在加载地图'):frame?.status||'等待进入对局';
  byId('empty-detail').textContent=state==='offline'?'请检查局域网连接，并保持设备端程序运行':usable&&!image?(imageRetry?'正在自动重试，底图加载后恢复目标显示':'地图加载后将显示目标位置'):'地图将在对局开始后自动显示';
 }
 function text(value,x,y,color='#e5edf8',font=12){ctx.font=`500 ${font}px system-ui,"Microsoft YaHei",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=3;ctx.strokeStyle='#08111be8';ctx.strokeText(value,x,y);ctx.fillStyle=color;ctx.fillText(value,x,y);}
 function render(now){if(!paused)poll(now);const state=connectionState(frame,lastPacket,now,paused,attempted);const usable=!!frame&&frame.ready&&(paused||state==='live');
  updateUi(now,state,usable);
  if(!entered){requestAnimationFrame(render);return;}
  if(pixelRatio!==(devicePixelRatio||1))resize();
  ++markerGeneration;markerRoot.style.visibility=usable&&image?'visible':'hidden';
  ctx.clearRect(0,0,width,height);const size=Math.max(1,Math.min(width-36,height-60))*zoom,origin={x:(width-size)/2+pan.x,y:(height-size)/2+pan.y-8};
  if(image&&frame?.mapId)ctx.drawImage(image,origin.x,origin.y,size,size);
  const targets=usable?visibleTargets(frame,settings):[];
  if(usable&&image){for(const player of targets){const point=markerPoint(player.position,size,origin);if(point.x<-60||point.x>width+60||point.y<-60||point.y>height+60)continue;const style=targetMarkerStyle(player,settings);
    targetDot(player,point,style);
    if(settings.names)text(String(player.name||'').slice(0,36),point.x,point.y-style.extent-10,player.bot?'#ffffff':'#ffff00');
    let bottom=point.y+style.extent+10;if(settings.distances&&Number.isFinite(player.distance)){text(Math.round(player.distance)+' m',point.x,bottom);bottom+=15;}
    if(settings.weapons&&player.weapon){text(String(player.weapon).slice(0,32),point.x,bottom,'#ffff00',12);bottom+=15;}
    if(settings.ids){text('#'+String(player.id),point.x,bottom,'#96afca',10);bottom+=14;}
    if(settings.healthRing&&style.ratio===null)text('血量 —',point.x,bottom,'#b4b4b4',10);
   }
  }
  finishMarkers(usable&&image?visibleSelf(frame,settings):null,size,origin);
  requestAnimationFrame(render);
 }
 if(route.room||location.hash==='#view=radar')showWorkspace(true);
 requestAnimationFrame(render);
}
