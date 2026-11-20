'use strict';
(() => {
  const pageTriangles=50000,headerBytes=96;
  const finite=Number.isFinite;
  function request(region,mapId,revision='0',page=0,textured=true) {
    if(!['cn','global'].includes(region)||!Number.isInteger(mapId)||mapId<=0||typeof revision!=='string'||
       !/^(0|[1-9]\d{0,19})$/.test(revision)||BigInt(revision)>18446744073709551615n||
       !Number.isInteger(page)||page<0||page>4294967295||(revision==='0'&&page!==0)||typeof textured!=='boolean')return null;
    return {region,mapId,revision,page,textured,key:`/scene/${textured?'':'solid/'}${region}/${mapId}/${revision}/${page}.bin`};
  }
  function decode(buffer,expected) {
    if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<headerBytes||buffer.byteLength>headerBytes+pageTriangles*72||!expected)return null;
    const header=new DataView(buffer),surfaces=header.getUint8(5)===51,magic=[85,65,77,51,68,surfaces?51:50,0,0];
    if(magic.some((byte,i)=>header.getUint8(i)!==byte)||(surfaces&&expected.textured===false))return null;
    const mapId=header.getUint32(8,true),selection=header.getUint32(12,true),page=header.getUint32(16,true),pages=header.getUint32(20,true);
    const count=header.getUint32(24,true),flags=header.getUint32(28,true),revision=header.getBigUint64(32,true).toString();
    const total=Number(header.getBigUint64(40,true)),terrain=Number(header.getBigUint64(88,true));
    const origin=[48,52,56].map(offset=>header.getFloat32(offset,true));
    const minimum=[60,64,68].map(offset=>header.getFloat32(offset,true)),maximum=[72,76,80].map(offset=>header.getFloat32(offset,true));
    if(mapId!==expected.mapId||selection!==(expected.region==='cn'?1:2)||page!==expected.page||revision==='0'||
       (expected.revision!=='0'&&revision!==expected.revision)||![total,terrain].every(Number.isSafeInteger)||total<=0||terrain>total||
       pages!==Math.ceil(total/pageTriangles)||page>=pages||count!==Math.min(pageTriangles,total-page*pageTriangles)||
       (flags!==0&&flags!==2)||header.getUint32(84,true)!==(surfaces?24:0)||buffer.byteLength!==headerBytes+count*(surfaces?72:36)||
       ![...origin,...minimum,...maximum].every(finite)||minimum.some((v,i)=>v>maximum[i]||origin[i]<v||origin[i]>maximum[i]))return null;
    const vertices=new Float32Array(buffer,headerBytes);
    for(const value of vertices)if(!finite(value))return null;
    if(surfaces){const ids=new Uint32Array(buffer,headerBytes);for(let at=5;at<ids.length;at+=18)if(ids[at]>65535||ids[at]!==ids[at+6]||ids[at]!==ids[at+12])return null;}
    const signature=JSON.stringify([mapId,selection,revision,pages,total,terrain,flags,origin,minimum,maximum,surfaces]);
    return {vertices,count,flags,mapId,page,pages,revision,total,terrain,origin,minimum,maximum,signature,surfaces,region:expected.region};
  }
  const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
  const dot=(a,b)=>a.reduce((v,n,i)=>v+n*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const normal=a=>{const length=Math.hypot(...a);return a.map(v=>v/length);};
  function camera(focus,azimuth,elevation,distance,aspect,radius=100,verticalFov=Math.PI/3) {
    const eye=[focus[0]+Math.cos(azimuth)*Math.cos(elevation)*distance,
      focus[1]+Math.sin(azimuth)*Math.cos(elevation)*distance,focus[2]+Math.sin(elevation)*distance];
    // UE world space is left-handed: looking along +X, +Y is screen-right.
    // Keep Z up while matching the native overlay's right/up camera basis.
    const z=normal(subtract(eye,focus)),x=normal(cross(z,[0,0,1])),y=cross(x,z);
    const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
    const f=1/Math.tan(verticalFov/2),near=Math.max(.2,distance/10000),far=Math.max(2000,distance+radius*4);
    const p=[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];
    const matrix=new Float32Array(16);
    for(let c=0;c<4;++c)for(let r=0;r<4;++r)for(let k=0;k<4;++k)matrix[c*4+r]+=p[k*4+r]*view[c*4+k];
    return matrix;
  }
  function firstPersonCamera(view,origin,aspect,radius=100,yawOffset=0,pitchOffset=0,fov=75) {
    if(!view||![view.x,view.y,view.z,view.yaw,view.pitch,...origin,aspect].every(finite)||aspect<=0)return null;
    const yaw=(view.yaw+yawOffset)*Math.PI/180,pitch=Math.max(-89,Math.min(89,view.pitch+pitchOffset))*Math.PI/180;
    const eye=[(view.x-origin[0])*.01,(view.y-origin[1])*.01,(view.z-origin[2])*.01];
    const forward=[Math.cos(yaw)*Math.cos(pitch),Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch)];
    return camera(eye.map((v,i)=>v+forward[i]),yaw+Math.PI,-pitch,1,aspect,radius,2*Math.atan(Math.tan(fov*Math.PI/360)/aspect));
  }
  function project(matrix,p,width,height,clipViewport=true) {
    const v=[p[0],p[1],p[2],1],clip=[0,0,0,0];
    for(let r=0;r<4;++r)for(let c=0;c<4;++c)clip[r]+=matrix[c*4+r]*v[c];
    if(clip[3]<=0||(clipViewport&&(Math.abs(clip[0])>clip[3]||Math.abs(clip[1])>clip[3]))||Math.abs(clip[2])>clip[3])return null;
    return {x:(clip[0]/clip[3]+1)*width/2,y:(1-clip[1]/clip[3])*height/2};
  }
  function create(canvas,overlay,onError,decorationCanvas=null,onSurfaceStatus=()=>{}) {
    let gl;
    try{gl=canvas.getContext('webgl2',{alpha:false,antialias:true,preserveDrawingBuffer:false});}catch(_){}
    if(!gl){onError('当前浏览器不支持 WebGL 2，请使用 2D 地图。');return null;}
    const decoration=decorationCanvas?.getContext('2d');
    let program,position,textureCoordinate,matrixLocation,hasTextureLocation,tintLocation,scaleLocation,offsetLocation,rotationLocation,cutoffLocation,whiteTexture;
    let avatarModel=null,avatarRenderer=null,avatarExpiry=0,surfaceLoad=null,materials=[];
    const textures=new Map();
    const chunks=[];
    function clearSurfaces(){surfaceLoad?.abort();surfaceLoad=null;materials=[];for(const texture of textures.values())gl.deleteTexture(texture);textures.clear();onSurfaceStatus('');}
    function clearBuffers(){for(const chunk of chunks)for(const group of chunk.groups)gl.deleteBuffer(group.buffer);chunks.length=0;clearSurfaces();}
    function release(){clearBuffers();avatarRenderer?.dispose();avatarRenderer=null;if(program)gl.deleteProgram(program);if(whiteTexture)gl.deleteTexture(whiteTexture);whiteTexture=null;program=null;}
    function initialize() {
      const shaders=[];
      function shader(type,source) {
        const value=gl.createShader(type);if(!value)return null;shaders.push(value);
        gl.shaderSource(value,source);gl.compileShader(value);
        return gl.getShaderParameter(value,gl.COMPILE_STATUS)?value:null;
      }
      const vertex=shader(gl.VERTEX_SHADER,`#version 300 es
        in vec3 position;in vec2 textureCoordinate;uniform mat4 camera;out vec3 world;out vec2 uv;
        void main(){world=position;uv=textureCoordinate;gl_Position=camera*vec4(position,1.0);}`);
      const fragment=shader(gl.FRAGMENT_SHADER,`#version 300 es
        precision highp float;in vec3 world;in vec2 uv;out vec4 color;
        uniform sampler2D baseTexture;uniform bool hasTexture;uniform vec4 tint;
        uniform vec2 uvScale,uvOffset;uniform float uvRotation,alphaCutoff;
        void main(){vec3 n=normalize(cross(dFdx(world),dFdy(world)));
          float light=.60+.40*abs(dot(n,normalize(vec3(.3,-.5,.8))));
          vec3 base=mix(vec3(.24,.40,.43),vec3(.44,.49,.37),abs(n.z));
          vec2 p=uv*uvScale;float c=cos(uvRotation),s=sin(uvRotation);
          vec4 sampled=hasTexture?texture(baseTexture,mat2(c,-s,s,c)*p+uvOffset):vec4(base,1.0);
          sampled*=tint;if(sampled.a<alphaCutoff)discard;
          color=vec4(sampled.rgb*light,1.0);}`);
      if(vertex&&fragment){program=gl.createProgram();if(program){gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);}}
      for(const value of shaders)gl.deleteShader(value);
      if(!program||!gl.getProgramParameter(program,gl.LINK_STATUS)){release();return false;}
      position=gl.getAttribLocation(program,'position');textureCoordinate=gl.getAttribLocation(program,'textureCoordinate');matrixLocation=gl.getUniformLocation(program,'camera');
      hasTextureLocation=gl.getUniformLocation(program,'hasTexture');tintLocation=gl.getUniformLocation(program,'tint');
      scaleLocation=gl.getUniformLocation(program,'uvScale');offsetLocation=gl.getUniformLocation(program,'uvOffset');
      rotationLocation=gl.getUniformLocation(program,'uvRotation');cutoffLocation=gl.getUniformLocation(program,'alphaCutoff');
      if(position<0||textureCoordinate<0||matrixLocation===null){release();return false;}
      whiteTexture=gl.createTexture();if(!whiteTexture){release();return false;}gl.bindTexture(gl.TEXTURE_2D,whiteTexture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      return true;
    }
    if(!initialize()){onError('3D 渲染器初始化失败，请使用 2D 地图。');return null;}
    avatarRenderer=globalThis.UamRadarAvatar?.create(gl);
    let scene=null,target=null,items=[],visible=false,lost=false,pending=0,azimuth=-Math.PI/2,elevation=.55,distance=28,overview=false,autoFit=true;
    let perspective='third',lookYaw=0,lookPitch=0,firstFov=75;
    function surfaceStatus(load){if(surfaceLoad!==load)return;const total=load.wanted.size;
      onSurfaceStatus('官方贴图 '+load.loaded+' / '+total+(load.failed.size?' · '+load.failed.size+' 项暂不可用':'')+(load.unsupported?' · '+load.unsupported+' 个材质暂不支持':''));}
    function pause(signal,delay){return new Promise((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(new Error('cancelled'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},delay);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});}
    async function resource(url,load){const deadline=performance.now()+180000;for(let tries=0;performance.now()<deadline;++tries){if(load.signal.aborted)throw new Error('cancelled');
      const response=await RadarPages.fetch(url,{cache:'default',signal:load.signal});if(response.status!==202){if(!response.ok)throw new Error('resource '+response.status);return response;}await response.arrayBuffer();await pause(load.signal,tries<8?25:100);}
      throw new Error('resource timeout');}
    function registerTextures(load,groups){for(const group of groups){const row=materials[group.material];if(!row?.texture)continue;
      let item=load.wanted.get(row.texture);if(!item){item={url:row.texture,id:group.material,bounds:[]};load.wanted.set(row.texture,item);load.queue.push(item);}item.bounds.push(group);}}
    function nearestTexture(load){const focus=scene&&target&&[target.x,target.y,target.z].every(finite)?[target.x,target.y,target.z].map((v,i)=>(v-scene.origin[i])*.01):[0,0,0];
      let best=0,distance=Infinity;for(let i=0;i<load.queue.length;++i){let score=Infinity;for(const box of load.queue[i].bounds){let d=0;for(let axis=0;axis<3;++axis){const v=focus[axis],delta=Math.max(box.minimum[axis]-v,0,v-box.maximum[axis]);d+=delta*delta;}score=Math.min(score,d);}if(score<distance){distance=score;best=i;}}
      return load.queue.splice(best,1)[0];}
    function queueTextures(load){if(surfaceLoad!==load||!load.ready)return;
      surfaceStatus(load);while(visible&&load.active<3&&load.queue.length){const item=nearestTexture(load),id=item.id;++load.active;
        void (async()=>{let bitmap,texture;try{const response=await resource(item.url,load);const blob=await response.blob();if(blob.size>8*1024*1024)throw new Error('texture size');
          bitmap=await createImageBitmap(blob,{premultiplyAlpha:'none',colorSpaceConversion:'none'});if(surfaceLoad!==load||lost)return;
          if(bitmap.width<1||bitmap.height<1||bitmap.width>2048||bitmap.height>2048)throw new Error('texture dimensions');
          texture=gl.createTexture();if(!texture)throw new Error('texture allocation');gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,materials[id].repeat?gl.REPEAT:gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,materials[id].repeat?gl.REPEAT:gl.CLAMP_TO_EDGE);gl.generateMipmap(gl.TEXTURE_2D);
          if(gl.getError()!==gl.NO_ERROR)throw new Error('texture upload');textures.set(item.url,texture);texture=null;++load.loaded;schedule();
        }catch(_){if(!load.signal.aborted)load.failed.add(id);}finally{bitmap?.close();if(texture)gl.deleteTexture(texture);--load.active;queueTextures(load);}})();
      }
    }
    function loadSurfaces(value){if(!value.surfaces||surfaceLoad)return;const load=new AbortController();surfaceLoad=load;
      Object.assign(load,{ready:false,wanted:new Map(),failed:new Set(),queue:[],active:0,loaded:0,unsupported:0});onSurfaceStatus('正在读取官方材质和贴图…');
      const base=`/scene/${value.region}/${value.mapId}/${value.revision}`;
      void (async()=>{try{const response=await resource(base+'/materials.json',load);const data=await response.json();if(surfaceLoad!==load)return;
        if(data.revision!==value.revision||data.mapId!==value.mapId||!Array.isArray(data.materials)||data.materials.length>65536)throw new Error('material catalog');
        const validVector=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(finite);
        const urls=new Set(data.materials.map((_,id)=>base+'/texture/'+id+'.png'));
        if(data.materials.some((m,id)=>m.id!==id||(m.texture!==''&&!urls.has(m.texture))||!validVector(m.tint,4)||!validVector(m.scale,2)||!validVector(m.offset,2)||!finite(m.rotation)||!finite(m.alphaCutoff)||typeof m.repeat!=='boolean'))throw new Error('material fields');
        materials=data.materials;load.unsupported=data.unavailable||0;load.ready=true;for(const chunk of chunks)registerTextures(load,chunk.groups);queueTextures(load);
      }catch(_){if(surfaceLoad===load&&!load.signal.aborted)onSurfaceStatus('官方材质读取失败，请重新加载 3D 场景');}})();
    }
    function inView(matrix,minimum,maximum){let common=63;for(let corner=0;corner<8;++corner){const p=[corner&1?maximum[0]:minimum[0],corner&2?maximum[1]:minimum[1],corner&4?maximum[2]:minimum[2],1],v=[0,0,0,0];
      for(let r=0;r<4;++r)for(let c=0;c<4;++c)v[r]+=matrix[c*4+r]*p[c];let outside=0;for(let i=0;i<3;++i){if(v[i]<-v[3])outside|=1<<(i*2);if(v[i]>v[3])outside|=2<<(i*2);}common&=outside;if(!common)return true;}return false;}
    function radius(){return scene?Math.max(1,Math.hypot(...scene.maximum.map((v,i)=>(v-scene.minimum[i])*.005))):100;}
    function limitDistance(value){return Math.max(3,Math.min(Math.max(300,radius()*8),value));}
    function focusAndDistance(width,height) {
      const whole=overview||!target;
      const minimum=scene.focusMinimum||scene.minimum,maximum=scene.focusMaximum||scene.maximum;
      const center=minimum.map((v,i)=>(v*.5+maximum[i]*.5-scene.origin[i])*.01);
      const focus=whole?center:[(target.x-scene.origin[0])*.01,(target.y-scene.origin[1])*.01,
        finite(target.z)?(target.z-scene.origin[2])*.01:center[2]];
      const fitRadius=Math.max(1,Math.hypot(...maximum.map((v,i)=>(v-minimum[i])*.005)));
      const fitDistance=fitRadius/Math.sin(Math.atan(Math.tan(Math.PI/6)*Math.min(1,width/height)))*1.1;
      return {focus,distance:whole&&autoFit?Math.max(8,fitDistance):distance};
    }
    const pointers=new Map();let pinch=0;
    function draw() {
      pending=0;if(!visible||lost)return;
      const rect=canvas.getBoundingClientRect(),width=Math.max(1,rect.width),height=Math.max(1,rect.height);
      const scale=Math.min(globalThis.devicePixelRatio||1,2);
      if(canvas.width!==Math.round(width*scale)||canvas.height!==Math.round(height*scale)){canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);}
      if(decoration) {
        if(decorationCanvas.width!==canvas.width||decorationCanvas.height!==canvas.height){decorationCanvas.width=canvas.width;decorationCanvas.height=canvas.height;}
        decoration.setTransform(scale,0,0,scale,0,0);decoration.clearRect(0,0,width,height);
      }
      gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.065,.09,.105,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      if(!scene){for(const item of items)item.node.hidden=true;return;}
      const view=focusAndDistance(width,height),matrix=perspective==='first'?
        (target?.view?.expiresAt<=performance.now()?null:firstPersonCamera(target?.view,scene.origin,width/height,radius(),lookYaw,lookPitch,firstFov)):
        camera(view.focus,azimuth,elevation,view.distance,width/height,radius());
      if(!matrix){for(const item of items)item.node.hidden=true;return;}
      gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(program);
      gl.enableVertexAttribArray(position);gl.enableVertexAttribArray(textureCoordinate);gl.uniformMatrix4fv(matrixLocation,false,matrix);gl.activeTexture(gl.TEXTURE0);
      for(const chunk of chunks)for(const group of chunk.groups){if(!inView(matrix,group.minimum,group.maximum))continue;
        const m=materials[group.material],texture=textures.get(m?.texture);gl.bindTexture(gl.TEXTURE_2D,texture||whiteTexture);gl.uniform1i(hasTextureLocation,Boolean(texture));
        gl.uniform4fv(tintLocation,m?.tint||[1,1,1,1]);gl.uniform2fv(scaleLocation,m?.scale||[1,1]);gl.uniform2fv(offsetLocation,m?.offset||[0,0]);gl.uniform1f(rotationLocation,(m?.rotation||0)*Math.PI/180);gl.uniform1f(cutoffLocation,m?.alphaCutoff||0);
        gl.bindBuffer(gl.ARRAY_BUFFER,group.buffer);gl.vertexAttribPointer(position,3,gl.FLOAT,false,20,0);gl.vertexAttribPointer(textureCoordinate,2,gl.FLOAT,false,20,12);gl.drawArrays(gl.TRIANGLES,0,group.count);
      }
      const now=performance.now(),viewItems=perspective==='first'?items.filter(i=>i.id!==target?.id):items;
      avatarRenderer?.draw(matrix,scene.origin,viewItems,now);
      for(const item of items) {
        if(perspective==='first'&&item.id===target?.id){item.node.hidden=true;continue;}
        const hasAvatar=avatarModel&&item.avatar&&now<item.avatar.expiresAt;
        item.node.classList.toggle('avatar-live',Boolean(hasAvatar));
        const root=[(item.x-scene.origin[0])*.01,(item.y-scene.origin[1])*.01,(item.z-scene.origin[2])*.01];
        const box=item.bounds&&now<item.boundsExpiresAt?item.bounds:null;
        const corners=box?Array.from({length:8},(_,i)=>project(matrix,
          root.map((v,axis)=>v+((i&(1<<axis))?box.maximum[axis]:box.minimum[axis])),width,height,false)):[];
        const screenBox=corners.length===8&&corners.every(Boolean)?{
          left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),
          top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))}:null;
        const head=box?[root[0]+(box.minimum[0]+box.maximum[0])*.5,root[1]+(box.minimum[1]+box.maximum[1])*.5,root[2]+box.maximum[2]]:root;
        const point=item.card&&screenBox?{x:(screenBox.left+screenBox.right)*.5,y:screenBox.top}:project(matrix,head,width,height);
        item.node.hidden=!point;
        if(!point)continue;
        const color=item.lineColor||'rgb('+item.tint?.map(v=>Math.round(v*255)).join(',')+')';
        const line=(a,b)=>{if(!decoration||!a||!b)return;decoration.moveTo(a.x,a.y);decoration.lineTo(b.x,b.y);};
        if(decoration&&(item.box||item.ray)) {
          decoration.beginPath();decoration.strokeStyle=color;decoration.lineWidth=1.3;decoration.globalAlpha=.95;
          if(item.box&&box)for(let i=0;i<8;++i)for(let axis=0;axis<3;++axis)if(!(i&(1<<axis)))line(corners[i],corners[i|(1<<axis)]);
          if(item.ray) {
            const feet=project(matrix,[root[0],root[1],root[2]+(box?box.minimum[2]:0)],width,height,false);
            line({x:width*.5,y:height-24},feet);
          }
          decoration.stroke();decoration.globalAlpha=1;
        }
        // Match the screen overlay: a fixed gap above this actor's projected
        // body. Other labels and viewport edges must never move the anchor.
        const x=point.x,y=point.y-(item.card?4:0);
        item.node.style.transform=`translate(${x}px,${y}px)`;
        if(item.distanceLabel){
          const feet=screenBox?{x:(screenBox.left+screenBox.right)*.5,y:screenBox.bottom}:
            project(matrix,[root[0],root[1],root[2]+(box?box.minimum[2]:0)],width,height);
          item.distanceLabel.hidden=!feet;
          if(feet){item.distanceLabel.style.left=(feet.x-x)+'px';item.distanceLabel.style.top=(feet.y-y+17)+'px';}
        }
      }
    }
    function schedule(){if(visible&&!lost&&!pending)pending=requestAnimationFrame(draw);}
    function zoom(factor){if(perspective==='first'){firstFov=Math.max(35,Math.min(110,firstFov*factor));schedule();return;}const rect=canvas.getBoundingClientRect();if(scene)distance=focusAndDistance(Math.max(1,rect.width),Math.max(1,rect.height)).distance;distance=limitDistance(distance*factor);autoFit=false;schedule();}
    const handlers=[];
    function listen(name,callback,options){canvas.addEventListener(name,callback,options);handlers.push([name,callback,options]);}
    listen('pointerdown',event=>{pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});canvas.setPointerCapture(event.pointerId);pinch=0;});
    listen('pointermove',event=>{
      const old=pointers.get(event.pointerId);if(!old)return;
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(pointers.size===1){if(perspective==='first'){lookYaw+=(event.clientX-old.x)*.2;lookPitch=Math.max(-89,Math.min(89,lookPitch-(event.clientY-old.y)*.15));}
        else {azimuth+=(event.clientX-old.x)*.008;elevation=Math.max(.12,Math.min(1.52,elevation+(event.clientY-old.y)*.006));}}
      else {const [a,b]=[...pointers.values()],next=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0&&next>0)zoom(pinch/next);pinch=next;}
      schedule();
    });
    for(const name of ['pointerup','pointercancel','lostpointercapture'])listen(name,event=>{pointers.delete(event.pointerId);pinch=0;});
    listen('wheel',event=>{event.preventDefault();zoom(Math.exp(Math.max(-100,Math.min(100,event.deltaY))*.003));},{passive:false});
    listen('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(event.key))return;event.preventDefault();
      if(perspective==='first') {
        if(event.key==='ArrowLeft')lookYaw-=4;if(event.key==='ArrowRight')lookYaw+=4;
        if(event.key==='ArrowUp')lookPitch=Math.min(89,lookPitch+3);if(event.key==='ArrowDown')lookPitch=Math.max(-89,lookPitch-3);
        if(event.key==='+'||event.key==='=')zoom(.85);if(event.key==='-')zoom(1/.85);schedule();return;
      }
      if(event.key==='ArrowLeft')azimuth-=.12;if(event.key==='ArrowRight')azimuth+=.12;
      if(event.key==='ArrowUp')elevation=Math.min(1.52,elevation+.08);if(event.key==='ArrowDown')elevation=Math.max(.12,elevation-.08);
      if(event.key==='+'||event.key==='=')zoom(.85);if(event.key==='-')zoom(1/.85);schedule();
    });
    listen('webglcontextlost',event=>{event.preventDefault();lost=true;clearTimeout(avatarExpiry);surfaceLoad?.abort();surfaceLoad=null;materials=[];textures.clear();whiteTexture=null;avatarRenderer=null;chunks.length=0;scene=null;overlay.replaceChildren();items=[];onError('3D 图形上下文已丢失，等待恢复…');});
    listen('webglcontextrestored',()=>{
      lost=false;program=null;
      if(!initialize()){lost=true;onError('3D 图形恢复失败，请切回 2D 后重试。');return;}
      avatarRenderer=globalThis.UamRadarAvatar?.create(gl);
      if(avatarModel&&!avatarRenderer?.setModel(avatarModel))avatarModel=null;
      onError('3D 图形已恢复，正在重新加载整图…');schedule();
    });
    return {
      addPage(value){
        if(lost||value.page!==chunks.length||(scene&&value.signature!==scene.signature))return false;
        const groups=[],ranges=new Map(),stride=value.surfaces?6:3,ids=value.surfaces?new Uint32Array(value.vertices.buffer,value.vertices.byteOffset,value.vertices.length):null;
        for(let triangle=0;triangle<value.count;++triangle){const at=triangle*stride*3,id=ids?ids[at+5]:0;if(!ranges.has(id))ranges.set(id,[]);ranges.get(id).push(at);}
        for(const [material,offsets] of ranges){const data=new Float32Array(offsets.length*15),minimum=[Infinity,Infinity,Infinity],maximum=[-Infinity,-Infinity,-Infinity];let out=0;
          for(const at of offsets)for(let vertex=0;vertex<3;++vertex){const p=at+vertex*stride;for(let axis=0;axis<3;++axis){const n=value.vertices[p+axis];data[out++]=n;minimum[axis]=Math.min(minimum[axis],n);maximum[axis]=Math.max(maximum[axis],n);}data[out++]=value.surfaces?value.vertices[p+3]:0;data[out++]=value.surfaces?value.vertices[p+4]:0;}
          const buffer=gl.createBuffer();if(buffer){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);}
          if(!buffer||gl.getError()!==gl.NO_ERROR){if(buffer)gl.deleteBuffer(buffer);for(const group of groups)gl.deleteBuffer(group.buffer);return false;}
          groups.push({buffer,material,count:offsets.length*3,minimum,maximum});
        }
        if(!scene){const {vertices,...metadata}=value;scene=metadata;}
        chunks.push({groups});loadSurfaces(value);if(surfaceLoad?.ready){registerTextures(surfaceLoad,groups);queueTextures(surfaceLoad);}schedule();return true;
      },
      setAvatar(model){if(lost||!avatarRenderer?.setModel(model))return false;avatarModel=model;schedule();return true;},
      setPerspective(value){if(!['first','third'].includes(value))return;perspective=value;lookYaw=lookPitch=0;firstFov=75;overview=false;schedule();},
      clear(){clearTimeout(avatarExpiry);scene=null;items=[];overlay.replaceChildren();if(!lost)clearBuffers();else chunks.length=0;schedule();},
      update(point,markers){
        clearTimeout(avatarExpiry);target=point;items=markers;overlay.replaceChildren(...items.map(item=>item.node));
        const expire=()=>{schedule();const now=performance.now(),next=Math.min(...items.map(i=>Math.max(i.avatar?.expiresAt||0,i.boundsExpiresAt||0)).filter(t=>t>now));
          if(Number.isFinite(next))avatarExpiry=setTimeout(expire,Math.max(1,next-now+1));};
        expire();
      },
      setVisible(value){visible=value;if(!value&&pending){cancelAnimationFrame(pending);pending=0;}if(value&&surfaceLoad)queueTextures(surfaceLoad);schedule();},
      fit(){perspective='third';overview=true;autoFit=true;azimuth=-Math.PI/2;elevation=1.15;distance=85;schedule();},
      follow(){overview=false;autoFit=true;lookYaw=lookPitch=0;firstFov=75;azimuth=-Math.PI/2;elevation=.55;distance=28;schedule();},resize:schedule,
      dispose(){visible=false;clearTimeout(avatarExpiry);if(pending)cancelAnimationFrame(pending);for(const args of handlers)canvas.removeEventListener(...args);overlay.replaceChildren();release();}
    };
  }
  globalThis.UamRadar3D={request,decode,camera,firstPersonCamera,project,create};
})();
