'use strict';
(() => {
  const modelId='nailong-v1',bones=20,poseLifetime=150;
  function decode(data) {
    if(data?.model!==modelId||data.bones!==bones||!Array.isArray(data.vertices)||
       !data.vertices.length||data.vertices.length>65535||!Array.isArray(data.indices)||
       !data.indices.length||data.indices.length%3||data.indices.length>400000)return null;
    const vertices=new Float32Array(data.vertices.length*14);
    for(let i=0;i<data.vertices.length;++i) {
      const v=data.vertices[i];
      if(!Array.isArray(v)||v.length!==14||!v.every(Number.isFinite)||v.slice(0,3).some(n=>Math.abs(n)>500)||
         v.slice(3,7).some(n=>!Number.isInteger(n)||n<0||n>=bones)||
         v.slice(7,11).some(n=>n<0||n>1)||Math.abs(v.slice(7,11).reduce((a,b)=>a+b,0)-1)>.001||
         v.slice(11).some(n=>!Number.isInteger(n)||n<0||n>255))return null;
      vertices.set(v.map((n,j)=>j<3?n*.01:j>=11?n/255:n),i*14);
    }
    if(data.indices.some(n=>!Number.isInteger(n)||n<0||n>=data.vertices.length))return null;
    const influenceBounds=Array.from({length:bones},()=>({min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]}));
    for(let i=0;i<vertices.length;i+=14)for(let j=0;j<4;++j)if(vertices[i+7+j]>0) {
      const box=influenceBounds[vertices[i+3+j]];
      for(let axis=0;axis<3;++axis){box.min[axis]=Math.min(box.min[axis],vertices[i+axis]);box.max[axis]=Math.max(box.max[axis],vertices[i+axis]);}
    }
    let eye=null;
    if(data.eye!==undefined) {
      if(!Array.isArray(data.eye)||data.eye.length!==4||!data.eye.every(Number.isFinite)||
         !Number.isInteger(data.eye[0])||data.eye[0]<0||data.eye[0]>=bones||data.eye.slice(1).some(n=>Math.abs(n)>500))return null;
      eye={joint:data.eye[0],point:data.eye.slice(1).map(n=>n*.01)};
    }
    return {model:modelId,vertices,indices:new Uint16Array(data.indices),influenceBounds,eye};
  }
  function view(model,avatar) {
    if(!model?.eye||!avatar?.matrices)return null;
    const at=model.eye.joint*12,m=avatar.matrices,p=model.eye.point;
    const position=[0,1,2].map(row=>m[at+row*4]*p[0]+m[at+row*4+1]*p[1]+m[at+row*4+2]*p[2]+m[at+row*4+3]);
    const length=Math.hypot(m[at],m[at+4],m[at+8]);if(!Number.isFinite(length)||length<.01)return null;
    return {x:position[0],y:position[1],z:position[2],yaw:Math.atan2(m[at+4],m[at])*180/Math.PI,
      pitch:Math.atan2(m[at+8],Math.hypot(m[at],m[at+4]))*180/Math.PI};
  }
  function bounds(model,avatar) {
    if(!model?.influenceBounds||!avatar?.matrices)return null;
    const minimum=[Infinity,Infinity,Infinity],maximum=[-Infinity,-Infinity,-Infinity],m=avatar.matrices;
    for(let bone=0;bone<bones;++bone) {
      const box=model.influenceBounds[bone];if(!Number.isFinite(box.min[0]))continue;
      for(let corner=0;corner<8;++corner) {
        const p=[corner&1?box.max[0]:box.min[0],corner&2?box.max[1]:box.min[1],corner&4?box.max[2]:box.min[2]];
        for(let row=0;row<3;++row) {
          const at=bone*12+row*4,v=m[at]*p[0]+m[at+1]*p[1]+m[at+2]*p[2]+m[at+3];
          minimum[row]=Math.min(minimum[row],v);maximum[row]=Math.max(maximum[row],v);
        }
      }
    }
    return [...minimum,...maximum].every(Number.isFinite)?{minimum,maximum}:null;
  }
  function pose(entity,packet,receivedAt,now) {
    if(packet?.avatarModel!==modelId||!entity||!Array.isArray(entity.avatarPose)||entity.avatarPose.length!==bones*12||
       !Number.isInteger(entity.avatarAgeMs)||entity.avatarAgeMs<0||entity.avatarAgeMs>=poseLifetime||
       ![receivedAt,now,entity.x,entity.y,entity.z].every(Number.isFinite)||now<receivedAt)return null;
    const expiresAt=receivedAt+poseLifetime-entity.avatarAgeMs;
    if(now>=expiresAt)return null;
    const matrices=new Float32Array(bones*12);
    for(let i=0;i<matrices.length;++i) {
      const n=entity.avatarPose[i],translation=i%4===3;
      if(!Number.isInteger(n)||Math.abs(n)>(translation?10000:160000))return null;
      matrices[i]=n/(translation?1000:10000);
    }
    return {matrices,expiresAt};
  }
  function create(gl) {
    let program=null,vao=null,vertexBuffer=null,indexBuffer=null,count=0,locations;
    function dispose() {
      if(vertexBuffer)gl.deleteBuffer(vertexBuffer);if(indexBuffer)gl.deleteBuffer(indexBuffer);
      if(vao)gl.deleteVertexArray(vao);if(program)gl.deleteProgram(program);
      program=vao=vertexBuffer=indexBuffer=null;count=0;
    }
    function setModel(model) {
      dispose();if(!model||model.model!==modelId)return false;
      const shaders=[];
      const compile=(type,source)=>{
        const shader=gl.createShader(type);if(!shader)return null;shaders.push(shader);
        gl.shaderSource(shader,source);gl.compileShader(shader);
        return gl.getShaderParameter(shader,gl.COMPILE_STATUS)?shader:null;
      };
      const vertex=compile(gl.VERTEX_SHADER,`#version 300 es
        in vec3 position;in vec4 joints;in vec4 weights;in vec3 color;
        uniform mat4 camera;uniform vec3 origin;uniform vec4 skin[60];
        out vec3 world;out vec3 material;
        vec3 transform(int joint,vec4 p){int j=joint*3;return vec3(dot(skin[j],p),dot(skin[j+1],p),dot(skin[j+2],p));}
        void main(){vec4 p=vec4(position,1.0);
          world=origin+transform(int(joints.x),p)*weights.x+transform(int(joints.y),p)*weights.y+
            transform(int(joints.z),p)*weights.z+transform(int(joints.w),p)*weights.w;
          material=color;gl_Position=camera*vec4(world,1.0);}`);
      const fragment=compile(gl.FRAGMENT_SHADER,`#version 300 es
        precision highp float;in vec3 world;in vec3 material;uniform vec3 tint;out vec4 color;
        void main(){vec3 n=normalize(cross(dFdx(world),dFdy(world)));
          float light=.65+.35*abs(dot(n,normalize(vec3(.3,-.5,.8))));
          color=vec4(mix(material,tint,.12)*light,1.0);}`);
      if(vertex&&fragment){program=gl.createProgram();if(program){gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);}}
      for(const shader of shaders)gl.deleteShader(shader);
      if(!program||!gl.getProgramParameter(program,gl.LINK_STATUS)){dispose();return false;}
      locations={camera:gl.getUniformLocation(program,'camera'),origin:gl.getUniformLocation(program,'origin'),
        skin:gl.getUniformLocation(program,'skin[0]'),tint:gl.getUniformLocation(program,'tint')};
      const attrs=['position','joints','weights','color'].map(name=>gl.getAttribLocation(program,name));
      if(Object.values(locations).some(v=>v===null)||attrs.some(v=>v<0)){dispose();return false;}
      vao=gl.createVertexArray();vertexBuffer=gl.createBuffer();indexBuffer=gl.createBuffer();
      if(!vao||!vertexBuffer||!indexBuffer){dispose();return false;}
      gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,model.vertices,gl.STATIC_DRAW);
      const sizes=[3,4,4,3],offsets=[0,12,28,44];
      for(let i=0;i<attrs.length;++i){gl.enableVertexAttribArray(attrs[i]);gl.vertexAttribPointer(attrs[i],sizes[i],gl.FLOAT,false,56,offsets[i]);}
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,model.indices,gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      if(gl.getError()!==gl.NO_ERROR){dispose();return false;}
      count=model.indices.length;return true;
    }
    function draw(matrix,sceneOrigin,items,now) {
      if(!program||!count)return 0;
      gl.useProgram(program);gl.bindVertexArray(vao);gl.uniformMatrix4fv(locations.camera,false,matrix);
      let drawn=0;
      // Radar avatars remain visible inside buildings; retain depth between
      // avatars and their own limbs after the static environment pass.
      gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
      for(const item of items) {
        if(!item.avatar||now>=item.avatar.expiresAt)continue;
        gl.uniform3f(locations.origin,(item.x-sceneOrigin[0])*.01,(item.y-sceneOrigin[1])*.01,(item.z-sceneOrigin[2])*.01);
        gl.uniform4fv(locations.skin,item.avatar.matrices);
        gl.uniform3fv(locations.tint,item.tint||[1,.3,.3]);
        gl.drawElements(gl.TRIANGLES,count,gl.UNSIGNED_SHORT,0);++drawn;
      }
      gl.bindVertexArray(null);return drawn;
    }
    return {setModel,draw,dispose};
  }
  globalThis.UamRadarAvatar={decode,pose,bounds,view,create};
})();
