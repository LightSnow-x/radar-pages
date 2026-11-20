/*
MIT License

Copyright (c) 2026 Arjun Barrett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
!function(f){typeof module!='undefined'&&typeof exports=='object'?module.exports=f():typeof define!='undefined'&&define.amd?define(f):(typeof self!='undefined'?self:this).fflate=f()}(function(){var _e={};"use strict";_e.deflate=zt,_e.deflateSync=kt,_e.inflate=At,_e.inflateSync=Tt,_e.gzip=It,_e.compress=It,_e.gzipSync=Ut,_e.compressSync=Ut,_e.gunzip=Zt,_e.gunzipSync=qt,_e.zlib=Lt,_e.zlibSync=Bt,_e.unzlib=Nt,_e.unzlibSync=Pt,_e.gzip=It,_e.compress=It,_e.decompress=Jt,_e.decompressSync=Kt,_e.strToU8=nn,_e.strFromU8=rn,_e.zip=dn,_e.zipSync=gn,_e.unzip=zn,_e.unzipSync=kn;var t=(typeof module!='undefined'&&typeof exports=='object'?function(_f){"use strict";var e,r,t,n=";var __w=require('worker_threads');__w.parentPort.on('message',function(m){onmessage({data:m})}),postMessage=function(m,t){__w.parentPort.postMessage(m,t)},close=process.exit;self=global";try{e=require("worker_threads"),r=e.Worker,t=e.isMarkedAsUntransferable}catch(e){}exports.default=r?function(e,o,a,s,u){var i=!1,l=new r(e+n,{eval:!0}).on("error",function(e){return u(e,null)}).on("message",function(e){return u(null,e)}).on("exit",function(e){e&&!i&&u(Error("exited with code "+e),null)});return t&&(s=s.filter(function(e){return!t(e)})),l.postMessage(a,s),l.terminate=function(){return i=!0,r.prototype.terminate.call(l)},l}:function(e,r,t,n,o){setImmediate(function(){return o(Error("async operations unsupported - update to Node 12+ (or Node 10-11 with the --experimental-worker CLI flag)"),null)});var a=function(){};return{terminate:a,postMessage:a}};return _f}:function(_f){"use strict";var e={};_f.default=function(r,t,s,a,n){var o=new Worker(e[t]||(e[t]=URL.createObjectURL(new Blob([r+';addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})'],{type:"text/javascript"}))));return o.onmessage=function(e){var r=e.data,t=r.$e$;if(t){var s=Error(t[0]);s.code=t[1],s.stack=t[2],n(s,null)}else n(null,r)},o.postMessage(s,a),o};return _f})({}),n=Uint8Array,r=Uint16Array,i=Int32Array,e=new n([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),o=new n([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),s=new n([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),a=function(t,n){for(var e=new r(31),o=0;o<31;++o)e[o]=n+=1<<t[o-1];var s=new i(e[30]);for(o=1;o<30;++o)for(var a=e[o];a<e[o+1];++a)s[a]=a-e[o]<<5|o;return{b:e,r:s}},u=a(e,2),h=u.b,f=u.r;h[28]=258,f[258]=28;for(var c=a(o,0),l=c.b,p=c.r,v=new r(32768),d=0;d<32768;++d){var g=(43690&d)>>1|(21845&d)<<1;v[d]=((65280&(g=(61680&(g=(52428&g)>>2|(13107&g)<<2))>>4|(3855&g)<<4))>>8|(255&g)<<8)>>1}var y=function(t,n,i){for(var e=t.length,o=0,s=new r(n);o<e;++o)t[o]&&++s[t[o]-1];var a,u=new r(n);for(o=1;o<n;++o)u[o]=u[o-1]+s[o-1]<<1;if(i){a=new r(1<<n);var h=15-n;for(o=0;o<e;++o)if(t[o])for(var f=o<<4|t[o],c=n-t[o],l=u[t[o]-1]++<<c,p=l|(1<<c)-1;l<=p;++l)a[v[l]>>h]=f}else for(a=new r(e),o=0;o<e;++o)t[o]&&(a[o]=v[u[t[o]-1]++]>>15-t[o]);return a},m=new n(288);for(d=0;d<144;++d)m[d]=8;for(d=144;d<256;++d)m[d]=9;for(d=256;d<280;++d)m[d]=7;for(d=280;d<288;++d)m[d]=8;var b=new n(32);for(d=0;d<32;++d)b[d]=5;var w=y(m,9,0),x=y(m,9,1),z=y(b,5,0),k=y(b,5,1),M=function(t){for(var n=t[0],r=1;r<t.length;++r)t[r]>n&&(n=t[r]);return n},S=function(t,n,r){var i=n/8|0;return(t[i]|t[i+1]<<8)>>(7&n)&r},A=function(t,n){var r=n/8|0;return(t[r]|t[r+1]<<8|t[r+2]<<16)>>(7&n)},T=function(t){return(t+7)/8|0},D=function(t,r,i){return(null==r||r<0)&&(r=0),(null==i||i>t.length)&&(i=t.length),new n(t.subarray(r,i))};_e.FlateErrorCode={UnexpectedEOF:0,InvalidBlockType:1,InvalidLengthLiteral:2,InvalidDistance:3,StreamFinished:4,NoStreamHandler:5,InvalidHeader:6,NoCallback:7,InvalidUTF8:8,ExtraFieldTooLong:9,InvalidDate:10,FilenameTooLong:11,StreamFinishing:12,InvalidZipData:13,UnknownCompressionMethod:14};var C=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],I=function(t,n,r){var i=Error(n||C[t]);if(i.code=t,Error.captureStackTrace&&Error.captureStackTrace(i,I),!r)throw i;return i},U=function(t,r,i,a){var u=t.length,f=a?a.length:0;if(!u||r.f&&!r.l)return i||new n(0);var c=!i,p=c||2!=r.i,v=r.i;c&&(i=new n(3*u));var d=function(t){var r=i.length;if(t>r){var e=new n(Math.max(2*r,t));e.set(i),i=e}},g=r.f||0,m=r.p||0,b=r.b||0,w=r.l,z=r.d,C=r.m,U=r.n,F=8*u;do{if(!w){g=S(t,m,1);var E=S(t,m+1,3);if(m+=3,!E){var Z=t[(Y=T(m)+4)-4]|t[Y-3]<<8,q=Y+Z;if(q>u){v&&I(0);break}p&&d(b+Z),i.set(t.subarray(Y,q),b),r.b=b+=Z,r.p=m=8*q,r.f=g;continue}if(1==E)w=x,z=k,C=9,U=5;else if(2==E){var O=S(t,m,31)+257,G=S(t,m+10,15)+4,L=O+S(t,m+5,31)+1;m+=14;for(var B=new n(L),H=new n(19),j=0;j<G;++j)H[s[j]]=S(t,m+3*j,7);m+=3*G;var N=M(H),P=(1<<N)-1,V=y(H,N,1);for(j=0;j<L;){var Y,J=V[S(t,m,P)];if(m+=15&J,(Y=J>>4)<16)B[j++]=Y;else{var K=0,Q=0;for(16==Y?(Q=3+S(t,m,3),m+=2,K=B[j-1]):17==Y?(Q=3+S(t,m,7),m+=3):18==Y&&(Q=11+S(t,m,127),m+=7);Q--;)B[j++]=K}}var R=B.subarray(0,O),W=B.subarray(O);C=M(R),U=M(W),w=y(R,C,1),z=y(W,U,1)}else I(1);if(m>F){v&&I(0);break}}p&&d(b+131072);for(var X=(1<<C)-1,$=(1<<U)-1,_=m;;_=m){var tt=(K=w[A(t,m)&X])>>4;if((m+=15&K)>F){v&&I(0);break}if(K||I(2),tt<256)i[b++]=tt;else{if(256==tt){_=m,w=null;break}var nt=tt-254;tt>264&&(nt=S(t,m,(1<<(et=e[j=tt-257]))-1)+h[j],m+=et);var rt=z[A(t,m)&$],it=rt>>4;if(rt||I(3),m+=15&rt,W=l[it],it>3){var et=o[it];W+=A(t,m)&(1<<et)-1,m+=et}if(m>F){v&&I(0);break}p&&d(b+131072);var ot=b+nt;if(b<W){var st=f-W,at=Math.min(W,ot);for(st+b<0&&I(3);b<at;++b)i[b]=a[st+b]}for(;b<ot;++b)i[b]=i[b-W]}}r.l=w,r.p=_,r.b=b,r.f=g,w&&(g=1,r.m=C,r.d=z,r.n=U)}while(!g);return b!=i.length&&c?D(i,0,b):i.subarray(0,b)},F=function(t,n,r){var i=n/8|0;t[i]|=r<<=7&n,t[i+1]|=r>>8},E=function(t,n,r){var i=n/8|0;t[i]|=r<<=7&n,t[i+1]|=r>>8,t[i+2]|=r>>16},Z=function(t,i){for(var e=[],o=0;o<t.length;++o)t[o]&&e.push({s:o,f:t[o]});var s=e.length,a=e.slice();if(!s)return{t:j,l:0};if(1==s){var u=new n(e[0].s+1);return u[e[0].s]=1,{t:u,l:1}}e.sort(function(t,n){return t.f-n.f}),e.push({s:-1,f:25001});var h=e[0],f=e[1],c=0,l=1,p=2;for(e[0]={s:-1,f:h.f+f.f,l:h,r:f};l!=s-1;)h=e[e[c].f<e[p].f?c++:p++],f=e[c!=l&&e[c].f<e[p].f?c++:p++],e[l++]={s:-1,f:h.f+f.f,l:h,r:f};var v=a[0].s;for(o=1;o<s;++o)a[o].s>v&&(v=a[o].s);var d=new r(v+1),g=q(e[l-1],d,0);if(g>i){o=0;var y=0,m=g-i,b=1<<m;for(a.sort(function(t,n){return d[n.s]-d[t.s]||t.f-n.f});o<s;++o){var w=a[o].s;if(!(d[w]>i))break;y+=b-(1<<g-d[w]),d[w]=i}for(y>>=m;y>0;){var x=a[o].s;d[x]<i?y-=1<<i-d[x]++-1:++o}for(;o>=0&&y;--o){var z=a[o].s;d[z]==i&&(--d[z],++y)}g=i}return{t:new n(d),l:g}},q=function(t,n,r){return-1==t.s?Math.max(q(t.l,n,r+1),q(t.r,n,r+1)):n[t.s]=r},O=function(t){for(var n=t.length;n&&!t[--n];);for(var i=new r(++n),e=0,o=t[0],s=1,a=function(t){i[e++]=t},u=1;u<=n;++u)if(t[u]==o&&u!=n)++s;else{if(!o&&s>2){for(;s>138;s-=138)a(32754);s>2&&(a(s>10?s-11<<5|28690:s-3<<5|12305),s=0)}else if(s>3){for(a(o),--s;s>6;s-=6)a(8304);s>2&&(a(s-3<<5|8208),s=0)}for(;s--;)a(o);s=1,o=t[u]}return{c:i.subarray(0,e),n:n}},G=function(t,n){for(var r=0,i=0;i<n.length;++i)r+=t[i]*n[i];return r},L=function(t,n,r){var i=r.length,e=T(n+2);t[e]=255&i,t[e+1]=i>>8,t[e+2]=255^t[e],t[e+3]=255^t[e+1];for(var o=0;o<i;++o)t[e+o+4]=r[o];return 8*(e+4+i)},B=function(t,n,i,a,u,h,f,c,l,p,v){F(n,v++,i),++u[256];for(var d=Z(u,15),g=d.t,x=d.l,k=Z(h,15),M=k.t,S=k.l,A=O(g),T=A.c,D=A.n,C=O(M),I=C.c,U=C.n,q=new r(19),B=0;B<T.length;++B)++q[31&T[B]];for(B=0;B<I.length;++B)++q[31&I[B]];for(var H=Z(q,7),j=H.t,N=H.l,P=19;P>4&&!j[s[P-1]];--P);var V,Y,J,K,Q=p+5<<3,R=G(u,m)+G(h,b)+f,W=G(u,g)+G(h,M)+f+14+3*P+G(q,j)+2*q[16]+3*q[17]+7*q[18];if(l>=0&&Q<=R&&Q<=W)return L(n,v,t.subarray(l,l+p));if(F(n,v,1+(W<R)),v+=2,W<R){V=y(g,x,0),Y=g,J=y(M,S,0),K=M;var X=y(j,N,0);for(F(n,v,D-257),F(n,v+5,U-1),F(n,v+10,P-4),v+=14,B=0;B<P;++B)F(n,v+3*B,j[s[B]]);v+=3*P;for(var $=[T,I],_=0;_<2;++_){var tt=$[_];for(B=0;B<tt.length;++B)F(n,v,X[rt=31&tt[B]]),v+=j[rt],rt>15&&(F(n,v,tt[B]>>5&127),v+=tt[B]>>12)}}else V=w,Y=m,J=z,K=b;for(B=0;B<c;++B){var nt=a[B];if(nt>255){var rt;E(n,v,V[257+(rt=nt>>18&31)]),v+=Y[rt+257],rt>7&&(F(n,v,nt>>23&31),v+=e[rt]);var it=31&nt;E(n,v,J[it]),v+=K[it],it>3&&(E(n,v,nt>>5&8191),v+=o[it])}else E(n,v,V[nt]),v+=Y[nt]}return E(n,v,V[256]),v+Y[256]},H=new i([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),j=new n(0),N=function(t,s,a,u,h,c){var l=c.z||t.length,v=new n(u+l+5*(1+Math.ceil(l/7e3))+h),d=v.subarray(u,v.length-h),g=c.l,y=7&(c.r||0);if(s){y&&(d[0]=c.r>>3);for(var m=H[s-1],b=m>>13,w=8191&m,x=(1<<a)-1,z=c.p||new r(32768),k=c.h||new r(x+1),M=Math.ceil(a/3),S=2*M,A=function(n){return(t[n]^t[n+1]<<M^t[n+2]<<S)&x},C=new i(25e3),I=new r(288),U=new r(32),F=0,E=0,Z=c.i||0,q=0,O=c.w||0,G=0;Z+2<l;++Z){var j=A(Z),N=32767&Z,P=k[j];if(z[N]=P,k[j]=N,O<=Z){var V=l-Z;if((F>7e3||q>24576)&&(V>423||!g)){y=B(t,d,0,C,I,U,E,q,G,Z-G,y),q=F=E=0,G=Z;for(var Y=0;Y<286;++Y)I[Y]=0;for(Y=0;Y<30;++Y)U[Y]=0}var J=2,K=0,Q=w,R=N-P&32767;if(V>2&&j==A(Z-R))for(var W=Math.min(b,V)-1,X=Math.min(32767,Z),$=Math.min(258,V);R<=X&&--Q&&N!=P;){if(t[Z+J]==t[Z+J-R]){for(var _=0;_<$&&t[Z+_]==t[Z+_-R];++_);if(_>J){if(J=_,K=R,_>W)break;var tt=Math.min(R,_-2),nt=0;for(Y=0;Y<tt;++Y){var rt=Z-R+Y&32767,it=rt-z[rt]&32767;it>nt&&(nt=it,P=rt)}}}R+=(N=P)-(P=z[N])&32767}if(K){C[q++]=268435456|f[J]<<18|p[K];var et=31&f[J],ot=31&p[K];E+=e[et]+o[ot],++I[257+et],++U[ot],O=Z+J,++F}else C[q++]=t[Z],++I[t[Z]]}}for(Z=Math.max(Z,O);Z<l;++Z)C[q++]=t[Z],++I[t[Z]];y=B(t,d,g,C,I,U,E,q,G,Z-G,y),g||(c.r=7&y|d[y/8|0]<<3,y-=7,c.h=k,c.p=z,c.i=Z,c.w=O)}else{for(Z=c.w||0;Z<l+g;Z+=65535){var st=Z+65535;st>=l&&(d[y/8|0]=g,st=l),y=L(d,y+1,t.subarray(Z,st))}c.i=l}return D(v,0,u+T(y)+h)},P=function(){for(var t=new Int32Array(256),n=0;n<256;++n){for(var r=n,i=9;--i;)r=(1&r&&-306674912)^r>>>1;t[n]=r}return t}(),V=function(){var t=-1;return{p:function(n){for(var r=t,i=0;i<n.length;++i)r=P[255&r^n[i]]^r>>>8;t=r},d:function(){return~t}}},Y=function(){var t=1,n=0;return{p:function(r){for(var i=t,e=n,o=0|r.length,s=0;s!=o;){for(var a=Math.min(s+2655,o);s<a;++s)e+=i+=r[s];i=(65535&i)+15*(i>>16),e=(65535&e)+15*(e>>16)}t=i,n=e},d:function(){return(255&(t%=65521))<<24|(65280&t)<<8|(255&(n%=65521))<<8|n>>8}}},J=function(t,r,i,e,o){if(!o&&(o={l:1},r.dictionary)){var s=r.dictionary.subarray(-32768),a=new n(s.length+t.length);a.set(s),a.set(t,s.length),t=a,o.w=s.length}return N(t,null==r.level?6:r.level,null==r.mem?o.l?Math.ceil(1.5*Math.max(8,Math.min(13,Math.log(t.length)))):20:12+r.mem,i,e,o)},K=function(t,n){var r={};for(var i in t)r[i]=t[i];for(var i in n)r[i]=n[i];return r},Q=function(t,n,r){for(var i=t(),e=""+t,o=e.slice(e.indexOf("[")+1,e.lastIndexOf("]")).replace(/\s+/g,"").split(","),s=0;s<i.length;++s){var a=i[s],u=o[s];if("function"==typeof a){n+=";"+u+"=";var h=""+a;if(a.prototype)if(-1!=h.indexOf("[native code]")){var f=h.indexOf(" ",8)+1;n+=h.slice(f,h.indexOf("(",f))}else for(var c in n+=h,a.prototype)n+=";"+u+".prototype."+c+"="+a.prototype[c];else n+=h}else r[u]=a}return n},R=[],W=function(t){var n=[];for(var r in t)t[r].buffer&&n.push((t[r]=new t[r].constructor(t[r])).buffer);return n},X=function(n,r,i,e){if(!R[i]){for(var o="",s={},a=n.length-1,u=0;u<a;++u)o=Q(n[u],o,s);R[i]={c:Q(n[a],o,s),e:s}}var h=K({},R[i].e);return(0,t.default)(R[i].c+";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage="+r+"}",i,h,W(h),e)},$=function(){return[n,r,i,e,o,s,h,l,x,k,v,C,y,M,S,A,T,D,I,U,Tt,et,ot]},_=function(){return[n,r,i,e,o,s,f,p,w,m,z,b,v,H,j,y,F,E,Z,q,O,G,L,B,T,D,N,J,kt,et]},tt=function(){return[pt,gt,lt,V,P]},nt=function(){return[vt,dt]},rt=function(){return[yt,lt,Y]},it=function(){return[mt]},et=function(t){return postMessage(t,[t.buffer])},ot=function(t){return t&&{out:t.size&&new n(t.size),dictionary:t.dictionary}},st=function(t,n,r,i,e,o){var s=X(r,i,e,function(t,n){s.terminate(),o(t,n)});return s.postMessage([t,n],n.consume?[t.buffer]:[]),function(){s.terminate()}},at=function(t){return t.ondata=function(t,n){return postMessage([t,n],[t.buffer])},function(n){n.data[0]?(t.push(n.data[0],n.data[1]),postMessage([n.data[0].length])):t.flush(n.data[1])}},ut=function(t,n,r,i,e,o,s){var a,u=X(t,i,e,function(t,r){t?(u.terminate(),n.ondata.call(n,t)):Array.isArray(r)?1==r.length?(n.queuedSize-=r[0],n.ondrain&&n.ondrain(r[0])):(r[1]&&u.terminate(),n.ondata.call(n,t,r[0],r[1])):s(r)});u.postMessage(r),n.queuedSize=0,n.push=function(t,r){n.ondata||I(5),a&&n.ondata(I(4,0,1),null,!!r),n.queuedSize+=t.length,u.postMessage([t,a=r],t.buffer instanceof ArrayBuffer?[t.buffer]:[])},n.terminate=function(){u.terminate()},o&&(n.flush=function(t){u.postMessage([0,t])})},ht=function(t,n){return t[n]|t[n+1]<<8},ft=function(t,n){return(t[n]|t[n+1]<<8|t[n+2]<<16|t[n+3]<<24)>>>0},ct=function(t,n){return ft(t,n)+4294967296*ft(t,n+4)},lt=function(t,n,r){for(;r;++n)t[n]=r,r>>>=8},pt=function(t,n){var r=n.filename;if(t[0]=31,t[1]=139,t[2]=8,t[8]=n.level<2?4:9==n.level?2:0,t[9]=3,0!=n.mtime&&lt(t,4,Math.floor(new Date(n.mtime||Date.now())/1e3)),r){t[3]=8;for(var i=0;i<=r.length;++i)t[i+10]=r.charCodeAt(i)}},vt=function(t){31==t[0]&&139==t[1]&&8==t[2]||I(6,"invalid gzip data");var n=t[3],r=10;4&n&&(r+=2+(t[10]|t[11]<<8));for(var i=(n>>3&1)+(n>>4&1);i>0;i-=!t[r++]);return r+(2&n)},dt=function(t){var n=t.length;return(t[n-4]|t[n-3]<<8|t[n-2]<<16|t[n-1]<<24)>>>0},gt=function(t){return 10+(t.filename?t.filename.length+1:0)},yt=function(t,n){var r=n.level,i=0==r?0:r<6?1:9==r?3:2;if(t[0]=120,t[1]=i<<6|(n.dictionary&&32),t[1]|=31-(t[0]<<8|t[1])%31,n.dictionary){var e=Y();e.p(n.dictionary),lt(t,2,e.d())}},mt=function(t,n){return(8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31)&&I(6,"invalid zlib data"),(t[1]>>5&1)==+!n&&I(6,"invalid zlib data: "+(32&t[1]?"need":"unexpected")+" dictionary"),2+(t[1]>>3&4)};function bt(t,n){return"function"==typeof t&&(n=t,t={}),this.ondata=n,t}var wt=function(){function t(t,r){if("function"==typeof t&&(r=t,t={}),this.ondata=r,this.o=t||{},this.s={l:0,i:32768,w:32768,z:32768},this.b=new n(98304),this.o.dictionary){var i=this.o.dictionary.subarray(-32768);this.b.set(i,32768-i.length),this.s.i=32768-i.length}}return t.prototype.p=function(t,n){this.ondata(J(t,this.o,0,0,this.s),n)},t.prototype.push=function(t,r){this.ondata||I(5),this.s.l&&I(4);var i=t.length+this.s.z;if(i>this.b.length){if(i>2*this.b.length-32768){var e=new n(-32768&i);e.set(this.b.subarray(0,this.s.z)),this.b=e}var o=this.b.length-this.s.z;this.b.set(t.subarray(0,o),this.s.z),this.s.z=this.b.length,this.p(this.b,!1),this.b.set(this.b.subarray(-32768)),this.b.set(t.subarray(o),32768),this.s.z=t.length-o+32768,this.s.i=32766,this.s.w=32768}else this.b.set(t,this.s.z),this.s.z+=t.length;this.s.l=1&r,(this.s.z>this.s.w+8191||r)&&(this.p(this.b,r||!1),this.s.w=this.s.i,this.s.i-=2),r&&(this.s=this.o={},this.b=j)},t.prototype.flush=function(t){if(this.ondata||I(5),this.s.l&&I(4),this.p(this.b,!1),this.s.w=this.s.i,this.s.i-=2,t){var r=new n(6);r[0]=this.s.r>>3;var i=L(r,this.s.r,j);this.s.r=0,this.ondata(r.subarray(0,i>>3),!1)}},t}();_e.Deflate=wt;var xt=function(){return function(t,n){ut([_,function(){return[at,wt]}],this,bt.call(this,t,n),function(t){var n=new wt(t.data);onmessage=at(n)},6,1)}}();function zt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[_],function(t){return et(kt(t.data[0],t.data[1]))},0,r)}function kt(t,n){return J(t,n||{},0,0)}_e.AsyncDeflate=xt;var Mt=function(){function t(t,r){"function"==typeof t&&(r=t,t={}),this.ondata=r;var i=t&&t.dictionary&&t.dictionary.subarray(-32768);this.s={i:0,b:i?i.length:0},this.o=new n(32768),this.p=new n(0),i&&this.o.set(i)}return t.prototype.e=function(t){if(this.ondata||I(5),this.d&&I(4),this.p.length){if(t.length){var r=new n(this.p.length+t.length);r.set(this.p),r.set(t,this.p.length),this.p=r}}else this.p=t},t.prototype.c=function(t){this.s.i=+(this.d=t||!1);var n=this.s.b,r=U(this.p,this.s,this.o);this.ondata(D(r,n,this.s.b),this.d),this.o=D(r,this.s.b-32768),this.s.b=this.o.length,this.p=D(this.p,this.s.p/8|0),this.s.p&=7},t.prototype.push=function(t,n){this.e(t),this.c(n)},t}();_e.Inflate=Mt;var St=function(){return function(t,n){ut([$,function(){return[at,Mt]}],this,bt.call(this,t,n),function(t){var n=new Mt(t.data);onmessage=at(n)},7,0)}}();function At(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[$],function(t){return et(Tt(t.data[0],ot(t.data[1])))},1,r)}function Tt(t,n){return U(t,{i:2},n&&n.out,n&&n.dictionary)}_e.AsyncInflate=St;var Dt=function(){function t(t,n){this.c=V(),this.l=0,this.v=1,wt.call(this,t,n)}return t.prototype.push=function(t,n){this.c.p(t),this.l+=t.length,wt.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){var r=J(t,this.o,this.v&&gt(this.o),n&&8,this.s);this.v&&(pt(r,this.o),this.v=0),n&&(lt(r,r.length-8,this.c.d()),lt(r,r.length-4,this.l)),this.ondata(r,n)},t.prototype.flush=function(t){wt.prototype.flush.call(this,t)},t}();_e.Gzip=Dt,_e.Compress=Dt;var Ct=function(){return function(t,n){ut([_,tt,function(){return[at,wt,Dt]}],this,bt.call(this,t,n),function(t){var n=new Dt(t.data);onmessage=at(n)},8,1)}}();function It(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[_,tt,function(){return[Ut]}],function(t){return et(Ut(t.data[0],t.data[1]))},2,r)}function Ut(t,n){n||(n={});var r=V(),i=t.length;r.p(t);var e=J(t,n,gt(n),8),o=e.length;return pt(e,n),lt(e,o-8,r.d()),lt(e,o-4,i),e}_e.AsyncGzip=Ct,_e.AsyncCompress=Ct;var Ft=function(){function t(t,n){this.v=1,this.r=0,Mt.call(this,t,n)}return t.prototype.push=function(t,r){if(Mt.prototype.e.call(this,t),this.r+=t.length,this.v){var i=this.p.subarray(this.v-1),e=i.length>3?vt(i):4;if(e>i.length){if(!r)return}else this.v>1&&this.onmember&&this.onmember(this.r-i.length);this.p=i.subarray(e),this.v=0}Mt.prototype.c.call(this,0),this.s.f&&!this.s.l?(this.v=T(this.s.p)+9,this.s={i:0},this.o=new n(0),this.push(new n(0),r)):r&&Mt.prototype.c.call(this,r)},t}();_e.Gunzip=Ft;var Et=function(){return function(t,n){var r=this;ut([$,nt,function(){return[at,Mt,Ft]}],this,bt.call(this,t,n),function(t){var n=new Ft(t.data);n.onmember=function(t){return postMessage(t)},onmessage=at(n)},9,0,function(t){return r.onmember&&r.onmember(t)})}}();function Zt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[$,nt,function(){return[qt]}],function(t){return et(qt(t.data[0],t.data[1]))},3,r)}function qt(t,r){var i=vt(t);return i+8>t.length&&I(6,"invalid gzip data"),U(t.subarray(i,-8),{i:2},r&&r.out||new n(dt(t)),r&&r.dictionary)}_e.AsyncGunzip=Et;var Ot=function(){function t(t,n){this.c=Y(),this.v=1,wt.call(this,t,n)}return t.prototype.push=function(t,n){this.c.p(t),wt.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){var r=J(t,this.o,this.v&&(this.o.dictionary?6:2),n&&4,this.s);this.v&&(yt(r,this.o),this.v=0),n&&lt(r,r.length-4,this.c.d()),this.ondata(r,n)},t.prototype.flush=function(t){wt.prototype.flush.call(this,t)},t}();_e.Zlib=Ot;var Gt=function(){return function(t,n){ut([_,rt,function(){return[at,wt,Ot]}],this,bt.call(this,t,n),function(t){var n=new Ot(t.data);onmessage=at(n)},10,1)}}();function Lt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[_,rt,function(){return[Bt]}],function(t){return et(Bt(t.data[0],t.data[1]))},4,r)}function Bt(t,n){n||(n={});var r=Y();r.p(t);var i=J(t,n,n.dictionary?6:2,4);return yt(i,n),lt(i,i.length-4,r.d()),i}_e.AsyncZlib=Gt;var Ht=function(){function t(t,n){Mt.call(this,t,n),this.v=t&&t.dictionary?2:1}return t.prototype.push=function(t,n){if(Mt.prototype.e.call(this,t),this.v){if(this.p.length<6&&!n)return;this.p=this.p.subarray(mt(this.p,this.v-1)),this.v=0}n&&(this.p.length<4&&I(6,"invalid zlib data"),this.p=this.p.subarray(0,-4)),Mt.prototype.c.call(this,n)},t}();_e.Unzlib=Ht;var jt=function(){return function(t,n){ut([$,it,function(){return[at,Mt,Ht]}],this,bt.call(this,t,n),function(t){var n=new Ht(t.data);onmessage=at(n)},11,0)}}();function Nt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[$,it,function(){return[Pt]}],function(t){return et(Pt(t.data[0],ot(t.data[1])))},5,r)}function Pt(t,n){return U(t.subarray(mt(t,n&&n.dictionary),-4),{i:2},n&&n.out,n&&n.dictionary)}_e.AsyncUnzlib=jt;var Vt=function(){function t(t,n){this.o=bt.call(this,t,n)||{},this.G=Ft,this.I=Mt,this.Z=Ht}return t.prototype.i=function(){var t=this;this.s.ondata=function(n,r){t.ondata(n,r)}},t.prototype.push=function(t,r){if(this.ondata||I(5),this.s)this.s.push(t,r);else{if(this.p&&this.p.length){var i=new n(this.p.length+t.length);i.set(this.p),i.set(t,this.p.length)}else this.p=t;this.p.length>2&&(this.s=31==this.p[0]&&139==this.p[1]&&8==this.p[2]?new this.G(this.o):8!=(15&this.p[0])||this.p[0]>>4>7||(this.p[0]<<8|this.p[1])%31?new this.I(this.o):new this.Z(this.o),this.i(),this.s.push(this.p,r),this.p=null)}},t}();_e.Decompress=Vt;var Yt=function(){function t(t,n){Vt.call(this,t,n),this.queuedSize=0,this.G=Et,this.I=St,this.Z=jt}return t.prototype.i=function(){var t=this;this.s.ondata=function(n,r,i){t.ondata(n,r,i)},this.s.ondrain=function(n){t.queuedSize-=n,t.ondrain&&t.ondrain(n)}},t.prototype.push=function(t,n){this.queuedSize+=t.length,Vt.prototype.push.call(this,t,n)},t}();function Jt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),31==t[0]&&139==t[1]&&8==t[2]?Zt(t,n,r):8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31?At(t,n,r):Nt(t,n,r)}function Kt(t,n){return 31==t[0]&&139==t[1]&&8==t[2]?qt(t,n):8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31?Tt(t,n):Pt(t,n)}_e.AsyncDecompress=Yt;var Qt=function(t,r,i,e){for(var o in t){var s=t[o],a=r+o,u=e;Array.isArray(s)&&(u=K(e,s[1]),s=s[0]),ArrayBuffer.isView(s)?i[a]=[s,u]:(i[a+="/"]=[new n(0),u],Qt(s,a,i,e))}},Rt="undefined"!=typeof TextEncoder&&new TextEncoder,Wt="undefined"!=typeof TextDecoder&&new TextDecoder,Xt=0;try{Wt.decode(j,{stream:!0}),Xt=1}catch(t){}var $t=function(t){for(var n="",r=0;;){var i=t[r++],e=(i>127)+(i>223)+(i>239);if(r+e>t.length)return{s:n,r:D(t,r-1)};e?3==e?(i=((15&i)<<18|(63&t[r++])<<12|(63&t[r++])<<6|63&t[r++])-65536,n+=String.fromCharCode(55296|i>>10,56320|1023&i)):n+=String.fromCharCode(1&e?(31&i)<<6|63&t[r++]:(15&i)<<12|(63&t[r++])<<6|63&t[r++]):n+=String.fromCharCode(i)}},_t=function(){function t(t){this.ondata=t,Xt?this.t=new TextDecoder:this.p=j}return t.prototype.push=function(t,r){if(this.ondata||I(5),r=!!r,this.t)return this.ondata(this.t.decode(t,{stream:!0}),r),void(r&&(this.t.decode().length&&I(8),this.t=null));this.p||I(4);var i=new n(this.p.length+t.length);i.set(this.p),i.set(t,this.p.length);var e=$t(i),o=e.s,s=e.r;r?(s.length&&I(8),this.p=null):this.p=s,this.ondata(o,r)},t}();_e.DecodeUTF8=_t;var tn=function(){function t(t){this.ondata=t}return t.prototype.push=function(t,n){this.ondata||I(5),this.d&&I(4),this.ondata(nn(t),this.d=n||!1)},t}();function nn(t,r){if(r){for(var i=new n(t.length),e=0;e<t.length;++e)i[e]=t.charCodeAt(e);return i}if(Rt)return Rt.encode(t);var o=t.length,s=new n(t.length+(t.length>>1)),a=0,u=function(t){s[a++]=t};for(e=0;e<o;++e){if(a+5>s.length){var h=new n(a+8+(o-e<<1));h.set(s),s=h}var f=t.charCodeAt(e);f<128||r?u(f):f<2048?(u(192|f>>6),u(128|63&f)):f>55295&&f<57344?(u(240|(f=65536+(1047552&f)|1023&t.charCodeAt(++e))>>18),u(128|f>>12&63),u(128|f>>6&63),u(128|63&f)):(u(224|f>>12),u(128|f>>6&63),u(128|63&f))}return D(s,0,a)}function rn(t,n){if(n){for(var r="",i=0;i<t.length;i+=16384)r+=String.fromCharCode.apply(null,t.subarray(i,i+16384));return r}if(Wt)return Wt.decode(t);var e=$t(t),o=e.s;return(r=e.r).length&&I(8),o}_e.EncodeUTF8=tn;var en=function(t){return 1==t?3:t<6?2:9==t?1:0},on=function(t,n){return n+30+ht(t,n+26)+ht(t,n+28)},sn=function(t,n,r){var i=ht(t,n+28),e=ht(t,n+30),o=rn(t.subarray(n+46,n+46+i),!(2048&ht(t,n+8))),s=n+46+i,a=an(t,s,e,r,ft(t,n+20),ft(t,n+24),ft(t,n+42)),u=a[0],h=a[1],f=a[2];return[ht(t,n+10),u,h,o,s+e+ht(t,n+32),f]},an=function(t,n,r,i,e,o,s){var a=4294967295==e,u=4294967295==o,h=4294967295==s,f=n+r;if(i&&a+u+h){for(;n+4<f;n+=4+ht(t,n+2))if(1==ht(t,n))return[a?ct(t,n+4+8*u):e,u?ct(t,n+4):o,h?ct(t,n+4+8*(u+a)):s,1];i<2&&I(13)}return[e,o,s,0]},un=function(t){var n=0;if(t)for(var r in t){var i=t[r].length;i>65535&&I(9),n+=i+4}return n},hn=function(t,n,r,i,e,o,s,a){var u=i.length,h=r.extra,f=a&&a.length,c=un(h);lt(t,n,null!=s?33639248:67324752),n+=4,null!=s&&(t[n++]=20,t[n++]=r.os),t[n]=20,n+=2,t[n++]=r.flag<<1|(o<0&&8),t[n++]=e&&8,t[n++]=255&r.compression,t[n++]=r.compression>>8;var l=new Date(null==r.mtime?Date.now():r.mtime),p=l.getFullYear()-1980;if((p<0||p>119)&&I(10),lt(t,n,p<<25|l.getMonth()+1<<21|l.getDate()<<16|l.getHours()<<11|l.getMinutes()<<5|l.getSeconds()>>1),n+=4,-1!=o&&(lt(t,n,r.crc),lt(t,n+4,o<0?-o-2:o),lt(t,n+8,r.size)),lt(t,n+12,u),lt(t,n+14,c),n+=16,null!=s&&(lt(t,n,f),lt(t,n+6,r.attrs),lt(t,n+10,s),n+=14),t.set(i,n),n+=u,c)for(var v in h){var d=h[v],g=d.length;lt(t,n,+v),lt(t,n+2,g),t.set(d,n+4),n+=4+g}return f&&(t.set(a,n),n+=f),n},fn=function(t,n,r,i,e){lt(t,n,101010256),lt(t,n+8,r),lt(t,n+10,r),lt(t,n+12,i),lt(t,n+16,e)},cn=function(){function t(t){this.filename=t,this.c=V(),this.size=0,this.compression=0}return t.prototype.process=function(t,n){this.ondata(null,t,n)},t.prototype.push=function(t,n){this.ondata||I(5),this.c.p(t),this.size+=t.length,n&&(this.crc=this.c.d()),this.process(t,n||!1)},t}();_e.ZipPassThrough=cn;var ln=function(){function t(t,n){var r=this;n||(n={}),cn.call(this,t),this.d=new wt(n,function(t,n){r.ondata(null,t,n)}),this.compression=8,this.flag=en(n.level)}return t.prototype.process=function(t,n){try{this.d.push(t,n)}catch(t){this.ondata(t,null,n)}},t.prototype.push=function(t,n){cn.prototype.push.call(this,t,n)},t}();_e.ZipDeflate=ln;var pn=function(){function t(t,n){var r=this;n||(n={}),cn.call(this,t),this.d=new xt(n,function(t,n,i){r.ondata(t,n,i)}),this.compression=8,this.flag=en(n.level),this.terminate=this.d.terminate}return t.prototype.process=function(t,n){this.d.push(t,n)},t.prototype.push=function(t,n){cn.prototype.push.call(this,t,n)},t}();_e.AsyncZipDeflate=pn;var vn=function(){function t(t){this.ondata=t,this.u=[],this.d=1}return t.prototype.add=function(t){var r=this;if(this.ondata||I(5),2&this.d)this.ondata(I(4+8*(1&this.d),0,1),null,!1);else{var i=nn(t.filename),e=i.length,o=t.comment,s=o&&nn(o),a=e!=t.filename.length||s&&o.length!=s.length,u=e+un(t.extra)+30;e>65535&&this.ondata(I(11,0,1),null,!1);var h=new n(u);hn(h,0,t,i,a,-1);var f=[h],c=function(){for(var t=0,n=f;t<n.length;t++)r.ondata(null,n[t],!1);f=[]},l=this.d;this.d=0;var p=this.u.length,v=K(t,{f:i,u:a,o:s,t:function(){t.terminate&&t.terminate()},r:function(){if(c(),l){var t=r.u[p+1];t?t.r():r.d=1}l=1}}),d=0;t.ondata=function(i,e,o){if(i)r.ondata(i,e,o),r.terminate();else if(d+=e.length,f.push(e),o){var s=new n(16);lt(s,0,134695760),lt(s,4,t.crc),lt(s,8,d),lt(s,12,t.size),f.push(s),v.c=d,v.b=u+d+16,v.crc=t.crc,v.size=t.size,l&&v.r(),l=1}else l&&c()},this.u.push(v)}},t.prototype.end=function(){var t=this;2&this.d?this.ondata(I(4+8*(1&this.d),0,1),null,!0):(this.d?this.e():this.u.push({r:function(){1&t.d&&(t.u.splice(-1,1),t.e())},t:function(){}}),this.d=3)},t.prototype.e=function(){for(var t=0,r=0,i=0,e=0,o=this.u;e<o.length;e++)i+=46+(h=o[e]).f.length+un(h.extra)+(h.o?h.o.length:0);for(var s=new n(i+22),a=0,u=this.u;a<u.length;a++){var h;hn(s,t,h=u[a],h.f,h.u,-h.c-2,r,h.o),t+=46+h.f.length+un(h.extra)+(h.o?h.o.length:0),r+=h.b}fn(s,t,this.u.length,i,r),this.ondata(null,s,!0),this.d=2},t.prototype.terminate=function(){for(var t=0,n=this.u;t<n.length;t++)n[t].t();this.d=2},t}();function dn(t,r,i){i||(i=r,r={}),"function"!=typeof i&&I(7);var e={};Qt(t,"",e,r);var o=Object.keys(e),s=o.length,a=0,u=0,h=s,f=Array(s),c=[],l=function(){for(var t=0;t<c.length;++t)c[t]()},p=function(t,n){xn(function(){i(t,n)})};xn(function(){p=i});var v=function(){var t=new n(u+22),r=a,i=u-a;u=0;for(var e=0;e<h;++e){var o=f[e];try{var s=o.c.length;hn(t,u,o,o.f,o.u,s);var c=30+o.f.length+un(o.extra),l=u+c;t.set(o.c,l),hn(t,a,o,o.f,o.u,s,u,o.m),a+=16+c+(o.m?o.m.length:0),u=l+s}catch(t){return p(t,null)}}fn(t,a,f.length,i,r),p(null,t)};s||v();for(var d=function(t){var n=o[t],r=e[n],i=r[0],h=r[1],d=V(),g=i.length;d.p(i);var y=nn(n),m=y.length,b=h.comment,w=b&&nn(b),x=w&&w.length,z=un(h.extra),k=0==h.level?0:8,M=function(r,i){if(r)l(),p(r,null);else{var e=i.length;f[t]=K(h,{size:g,crc:d.d(),c:i,f:y,m:w,u:m!=n.length||w&&b.length!=x,compression:k}),a+=30+m+z+e,u+=76+2*(m+z)+(x||0)+e,--s||v()}};if(m>65535&&M(I(11,0,1),null),k)if(g<16e4)try{M(null,kt(i,h))}catch(t){M(t,null)}else c.push(zt(i,h,M));else M(null,i)},g=0;g<h;++g)d(g);return l}function gn(t,r){r||(r={});var i={},e=[];Qt(t,"",i,r);var o=0,s=0;for(var a in i){var u=i[a],h=u[0],f=u[1],c=0==f.level?0:8,l=(M=nn(a)).length,p=f.comment,v=p&&nn(p),d=v&&v.length,g=un(f.extra);l>65535&&I(11);var y=c?kt(h,f):h,m=y.length,b=V();b.p(h),e.push(K(f,{size:h.length,crc:b.d(),c:y,f:M,m:v,u:l!=a.length||v&&p.length!=d,o:o,compression:c})),o+=30+l+g+m,s+=76+2*(l+g)+(d||0)+m}for(var w=new n(s+22),x=o,z=s-o,k=0;k<e.length;++k){var M;hn(w,(M=e[k]).o,M,M.f,M.u,M.c.length);var S=30+M.f.length+un(M.extra);w.set(M.c,M.o+S),hn(w,o,M,M.f,M.u,M.c.length,M.o,M.m),o+=16+S+(M.m?M.m.length:0)}return fn(w,o,e.length,z,x),w}_e.Zip=vn;var yn=function(){function t(){}return t.prototype.push=function(t,n){this.ondata(null,t,n)},t.compression=0,t}();_e.UnzipPassThrough=yn;var mn=function(){function t(){var t=this;this.i=new Mt(function(n,r){t.ondata(null,n,r)})}return t.prototype.push=function(t,n){try{this.i.push(t,n)}catch(t){this.ondata(t,null,n)}},t.compression=8,t}();_e.UnzipInflate=mn;var bn=function(){function t(t,n){var r=this;n<32e4?this.i=new Mt(function(t,n){r.ondata(null,t,n)}):(this.i=new St(function(t,n,i){r.ondata(t,n,i)}),this.terminate=this.i.terminate)}return t.prototype.push=function(t,n){this.i.terminate&&(t=D(t,0)),this.i.push(t,n)},t.compression=8,t}();_e.AsyncUnzipInflate=bn;var wn=function(){function t(t){this.onfile=t,this.k=[],this.o={0:yn},this.p=j}return t.prototype.push=function(t,r){var i=this;if(this.onfile||I(5),this.p||I(4),this.c>0){var e=Math.min(this.c,t.length),o=t.subarray(0,e);if(this.c-=e,this.d?this.d.push(o,!this.c):this.k[0].push(o),(t=t.subarray(e)).length)return this.push(t,r)}else{var s=0,a=0,u=void 0,h=void 0;this.p.length?t.length?((h=new n(this.p.length+t.length)).set(this.p),h.set(t,this.p.length)):h=this.p:h=t;for(var f=h.length,c=this.c,l=c&&this.d,p=function(){var t=ft(h,a);if(67324752==t){s=1,u=a,v.d=null,v.c=0;var n=ht(h,a+6),r=ht(h,a+8),e=2048&n,o=8&n,l=ht(h,a+26),p=ht(h,a+28);if(f>a+30+l+p){var d=[];v.k.unshift(d),s=2;var g,y=ft(h,a+18),m=ft(h,a+22),b=rn(h.subarray(a+30,a+=30+l),!e),w=an(h,a,p,2,y,m,0),x=w[0],z=w[1];o&&(x=-1-w[3]),a+=p,v.c=x;var k={name:b,compression:r,start:function(){if(k.ondata||I(5),x){var t=i.o[r];t||k.ondata(I(14,"unknown compression type "+r,1),null,!1),(g=x<0?new t(b):new t(b,x,z)).ondata=function(t,n,r){k.ondata(t,n,r)};for(var n=0,e=d;n<e.length;n++)g.push(e[n],!1);i.k[0]==d&&i.c?i.d=g:g.push(j,!0)}else k.ondata(null,j,!0)},terminate:function(){g&&g.terminate&&g.terminate()}};x>=0&&(k.size=x,k.originalSize=z),v.onfile(k)}return"break"}if(c){if(134695760==t)return u=a+=12+(-2==c&&8),s=3,v.c=0,"break";if(33639248==t)return u=a-=4,s=3,v.c=0,"break"}},v=this;a<f-4&&"break"!==p();++a);if(this.p=j,c<0){var d=h.subarray(0,s?u-12-(-2==c&&8)-(134695760==ft(h,u-16)&&4):a);l?l.push(d,!!s):this.k[+(2==s)].push(d)}if(2&s)return this.push(h.subarray(a),r);this.p=h.subarray(a)}r&&(this.c&&I(13),this.p=null)},t.prototype.register=function(t){this.o[t.compression]=t},t}();_e.Unzip=wn;var xn="function"==typeof queueMicrotask?queueMicrotask:"function"==typeof setTimeout?setTimeout:function(t){t()};function zn(t,r,i){i||(i=r,r={}),"function"!=typeof i&&I(7);var e=[],o=function(){for(var t=0;t<e.length;++t)e[t]()},s={},a=function(t,n){xn(function(){i(t,n)})};xn(function(){a=i});for(var u=t.length-22;101010256!=ft(t,u);--u)if(!u||t.length-u>65558)return a(I(13,0,1),null),o;var h=ht(t,u+8);if(h){var f=h,c=ft(t,u+16),l=117853008==ft(t,u-20);if(l){var p=ft(t,u-12);(l=101075792==ft(t,p))&&(f=h=ft(t,p+32),c=ft(t,p+48))}for(var v=r&&r.filter,d=function(r){var i=sn(t,c,l),u=i[0],f=i[1],p=i[2],d=i[3],g=i[4],y=on(t,i[5]);c=g;var m=function(t,n){t?(o(),a(t,null)):(n&&(s[d]=n),--h||a(null,s))};if(!v||v({name:d,size:f,originalSize:p,compression:u}))if(u)if(8==u){var b=t.subarray(y,y+f);if(p<524288||f>.8*p)try{m(null,Tt(b,{out:new n(p)}))}catch(t){m(t,null)}else e.push(At(b,{size:p},m))}else m(I(14,"unknown compression type "+u,1),null);else m(null,D(t,y,y+f));else m(null,null)},g=0;g<f;++g)d()}else a(null,{});return o}function kn(t,r){for(var i={},e=t.length-22;101010256!=ft(t,e);--e)(!e||t.length-e>65558)&&I(13);var o=ht(t,e+8);if(!o)return{};var s=ft(t,e+16),a=117853008==ft(t,e-20);if(a){var u=ft(t,e-12);(a=101075792==ft(t,u))&&(o=ft(t,u+32),s=ft(t,u+48))}for(var h=r&&r.filter,f=0;f<o;++f){var c=sn(t,s,a),l=c[0],p=c[1],v=c[2],d=c[3],g=c[4],y=on(t,c[5]);s=g,h&&!h({name:d,size:p,originalSize:v,compression:l})||(l?8==l?i[d]=Tt(t.subarray(y,y+p),{out:new n(v)}):I(14,"unknown compression type "+l):i[d]=D(t,y,y+p))}return i}return _e});
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
      const response=await fetch(url,{cache:'default',signal:load.signal});if(response.status!==202){if(!response.ok)throw new Error('resource '+response.status);return response;}await response.arrayBuffer();await pause(load.signal,tries<8?25:100);}
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
      const center=scene.minimum.map((v,i)=>(v*.5+scene.maximum[i]*.5-scene.origin[i])*.01);
      const focus=whole?center:[(target.x-scene.origin[0])*.01,(target.y-scene.origin[1])*.01,
        finite(target.z)?(target.z-scene.origin[2])*.01:center[2]];
      const fitDistance=radius()/Math.sin(Math.atan(Math.tan(Math.PI/6)*Math.min(1,width/height)))*1.1;
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

(() => {
  'use strict';

  const source = {
    url: 'https://media.meilinvps.com/f.php?id=NdA2vWGHYSmh.zip',
    bytes: 83101987,
    files: ['Dam_Iris.dfcol', 'Forrest.dfcol', 'SpaceCenter.dfcol', 'Brakkesh.dfcol', 'Tide.dfcol', 'AZ-5.dfcol'],
  };
  const headerSize = 64;
  const instanceSize = 92;
  const maximumModelBytes = 48 * 1024 * 1024;
  const triangleBudget = 420000;
  const terrainBudget = 140000;
  const maximumTriangles = 700000;
  const pageTriangles = 25000;
  const littleEndian = new Uint8Array(Uint16Array.of(1).buffer)[0] === 1;
  const boxIndices = Uint32Array.of(
    0,1,2, 0,2,3, 4,6,5, 4,7,6, 0,4,5, 0,5,1,
    2,6,7, 2,7,3, 0,3,7, 0,7,4, 1,5,6, 1,6,2,
  );

  const crcTable = Uint32Array.from({ length: 256 }, (_, byte) => {
    for (let bit = 0; bit < 8; ++bit) byte = (byte >>> 1) ^ (byte & 1 ? 0xedb88320 : 0);
    return byte;
  });
  function crc32(bytes, begin, end) {
    let crc = 0xffffffff;
    for (let at = begin; at < end; ++at) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[at]) & 255];
    return (crc ^ 0xffffffff) >>> 0;
  }

  const finite = Number.isFinite;
  const coordinate = value => finite(value) && Math.abs(value) <= 1e8;
  const positive = value => finite(value) && value > 0;
  const emptyBounds = () => ({ minimum: [Infinity, Infinity, Infinity], maximum: [-Infinity, -Infinity, -Infinity] });

  function vertexBounds(vertices) {
    const bounds = emptyBounds();
    for (let i = 0; i < vertices.length; i += 3) {
      for (let axis = 0; axis < 3; ++axis) {
        const value = vertices[i + axis];
        if (!coordinate(value)) return null;
        bounds.minimum[axis] = Math.min(bounds.minimum[axis], value);
        bounds.maximum[axis] = Math.max(bounds.maximum[axis], value);
      }
    }
    return bounds;
  }

  function boxGeometry(minimum, maximum) {
    const [x0, y0, z0] = minimum, [x1, y1, z1] = maximum;
    const vertices = Float32Array.of(
      x0,y0,z0, x1,y0,z0, x1,y1,z0, x0,y1,z0,
      x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1,
    );
    return { vertices, indices: boxIndices, bounds: { minimum, maximum } };
  }

  function numericView(reader, start, count, Type, name) {
    const offset = reader.bytes.byteOffset + start;
    const width = Type.BYTES_PER_ELEMENT;
    if (littleEndian && offset % width === 0) return new Type(reader.bytes.buffer, offset, count);
    const values = new Type(count);
    for (let i = 0; i < count; ++i) values[i] = reader.data[name](start + i * width, true);
    return values;
  }

  function readMesh(reader) {
    const at = reader.take(12);
    if (at < 0) return null;
    const count = reader.uint(at), triangles = reader.uint(at + 4), width = reader.uint(at + 8);
    if (!count || !triangles || (width !== 2 && width !== 4)) return null;
    const verticesAt = reader.take(count * 12);
    const indicesAt = reader.take(triangles * 3 * width);
    if (verticesAt < 0 || indicesAt < 0) return null;
    const vertices = numericView(reader, verticesAt, count * 3, Float32Array, 'getFloat32');
    const indices = width === 2 ? numericView(reader, indicesAt, triangles * 3, Uint16Array, 'getUint16') :
      numericView(reader, indicesAt, triangles * 3, Uint32Array, 'getUint32');
    const bounds = vertexBounds(vertices);
    if (!bounds || indices.some(index => index >= count)) return null;
    return { vertices, indices, bounds, variants: new Map() };
  }

  function readHeightField(reader) {
    const at = reader.take(24);
    if (at < 0) return null;
    const rows = reader.uint(at), columns = reader.uint(at + 4);
    const [heightScale, rowScale, columnScale] = reader.vector(at + 8);
    if (rows < 2 || columns < 2 || rows > 4096 || columns > 4096 ||
        ![heightScale, rowScale, columnScale].every(positive)) return null;
    const samples = reader.take(rows * columns * 4);
    if (samples < 0) return null;
    return { rows, columns, heightScale, rowScale, columnScale, samples, uses: 0, geometry: null };
  }

  function readBox(reader) {
    const at = reader.take(12);
    if (at < 0) return null;
    const extent = reader.vector(at);
    return extent.every(value => coordinate(value) && value > 0) ? boxGeometry(extent.map(value => -value), extent) : null;
  }

  function readConvex(reader) {
    const at = reader.take(12);
    if (at < 0) return null;
    const count = reader.uint(at), indexCount = reader.uint(at + 4), faces = reader.uint(at + 8);
    if (count < 4 || count > 255 || faces < 4 || faces > 2 * count - 4 ||
        indexCount < faces * 3 || indexCount > faces * count) return null;
    const verticesAt = reader.take(count * 12), indicesAt = reader.take(indexCount);
    if (verticesAt < 0 || indicesAt < 0) return null;
    const vertices = numericView(reader, verticesAt, count * 3, Float32Array, 'getFloat32');
    const bounds = vertexBounds(vertices);
    if (!bounds || reader.bytes.subarray(indicesAt, indicesAt + indexCount).some(index => index >= count)) return null;
    // DFCOL stores convex indices without face boundaries. Use the native loader's bounding-box fallback for radar LOD.
    return boxGeometry(bounds.minimum, bounds.maximum);
  }

  function rotation([x, y, z, w]) {
    const norm = Math.hypot(x, y, z, w);
    if (!finite(norm) || norm < 1e-5) return null;
    x /= norm; y /= norm; z /= norm; w /= norm;
    return [
      1 - 2*(y*y + z*z), 2*(x*y - z*w), 2*(x*z + y*w),
      2*(x*y + z*w), 1 - 2*(x*x + z*z), 2*(y*z - x*w),
      2*(x*z - y*w), 2*(y*z + x*w), 1 - 2*(x*x + y*y),
    ];
  }

  function multiply(left, right) {
    const out = new Array(9);
    for (let row = 0; row < 9; row += 3) {
      for (let column = 0; column < 3; ++column) {
        out[row + column] = left[row] * right[column] + left[row + 1] * right[3 + column] + left[row + 2] * right[6 + column];
      }
    }
    return out;
  }

  function meshScaling(scale, basis) {
    const out = new Array(9);
    // PxMeshScale applies the basis rotation before the axis scale and then rotates back.
    for (let row = 0; row < 3; ++row) {
      for (let column = 0; column < 3; ++column) {
        out[row * 3 + column] = basis[row] * scale[0] * basis[column] +
          basis[3 + row] * scale[1] * basis[3 + column] + basis[6 + row] * scale[2] * basis[6 + column];
      }
    }
    return out;
  }

  function readInstance(reader, resources) {
    const at = reader.take(instanceSize);
    if (at < 0) return null;
    const type = reader.uint(at + 28), index = reader.uint(at + 88);
    const resource = resources[type]?.[index];
    if (!resource) return null;
    const globalBasis = rotation(reader.vector(at, 4)), localBasis = rotation(reader.vector(at + 60, 4));
    const globalPosition = reader.vector(at + 16), localPosition = reader.vector(at + 76);
    if (!globalBasis || !localBasis || !globalPosition.every(coordinate) || !localPosition.every(coordinate)) return null;
    let basis = multiply(globalBasis, localBasis);
    const position = globalPosition.map((value, i) => value + globalBasis[i * 3] * localPosition[0] +
      globalBasis[i * 3 + 1] * localPosition[1] + globalBasis[i * 3 + 2] * localPosition[2]);
    let variant = null;
    if (type === 0 || type === 3) {
      const scale = reader.vector(at + 32), scaleBasis = rotation(reader.vector(at + 44, 4));
      if (!scaleBasis || !scale.every(value => coordinate(value) && Math.abs(value) > 1e-8)) return null;
      basis = multiply(basis, meshScaling(scale, scaleBasis));
      if (type === 0) {
        const tier = Math.ceil(Math.log2(Math.max(...scale.map(Math.abs))));
        if (!resource.variants.has(tier)) resource.variants.set(tier, { scale: 2 ** tier, uses: 0, geometry: null });
        variant = resource.variants.get(tier);
        ++variant.uses;
      }
    }
    if (type === 1) ++resource.uses;
    if (!basis.every(finite) || !position.every(coordinate)) return null;
    return { type, resource, basis, position, variant };
  }

  function readModel(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < headerSize || bytes.length > maximumModelBytes) return null;
    const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
    const uint = at => data.getUint32(at, true);
    const expectedMagic = [68,70,67,79,76,13,10,26];
    if (expectedMagic.some((byte, i) => bytes[i] !== byte) || uint(8) !== 1 || uint(12) !== headerSize ||
        uint(16) !== 0x01020304 || uint(20) !== 1 || uint(44) !== 0 || uint(52) !== 0 ||
        uint(48) !== bytes.length - headerSize || crc32(bytes, 0, 60) !== uint(60)) return null;
    const counts = [24, 28, 32, 36].map(uint), count = uint(40), checksum = uint(56);
    const minimumBytes = (counts[0] + counts[3]) * 12 + counts[1] * 24 + counts[2] * 12 + count * instanceSize;
    if (counts.some(value => value > 100000) || !count || count > 1000000 || minimumBytes > uint(48) ||
        crc32(bytes, headerSize, bytes.length) !== checksum) return null;

    let position = headerSize;
    const reader = {
      bytes, data, uint,
      vector: (at, length = 3) => Array.from({ length }, (_, i) => data.getFloat32(at + i * 4, true)),
      take(size) {
        if (size > bytes.length - position) return -1;
        const start = position;
        position += size;
        return start;
      },
    };
    const resources = [];
    for (const [type, read] of [readMesh, readHeightField, readBox, readConvex].entries()) {
      const current = [];
      for (let i = 0; i < counts[type]; ++i) {
        const object = read(reader);
        if (!object) return null;
        current.push(object);
      }
      resources.push(current);
    }
    if (bytes.length - position !== count * instanceSize) return null;
    const instances = [];
    for (let i = 0; i < count; ++i) {
      const instance = readInstance(reader, resources);
      if (!instance) return null;
      instances.push(instance);
    }
    return { data, meshes: resources[0], fields: resources[1], instances, checksum };
  }

  function simplifyMesh(mesh, spacing) {
    const { vertices, indices, bounds } = mesh;
    const span = bounds.maximum.map((value, axis) => value - bounds.minimum[axis]);
    const step = Math.max(spacing, ...span.map(value => value / 65534));
    const dimensions = span.map(value => Math.floor(value / step) + 1);
    const count = vertices.length / 3;
    const remap = new Uint32Array(count), weights = new Uint32Array(count), sums = new Float64Array(vertices.length);
    const cells = new Map();
    for (let i = 0; i < count; ++i) {
      const p = i * 3;
      const x = Math.floor((vertices[p] - bounds.minimum[0]) / step);
      const y = Math.floor((vertices[p + 1] - bounds.minimum[1]) / step);
      const z = Math.floor((vertices[p + 2] - bounds.minimum[2]) / step);
      const cell = (x * dimensions[1] + y) * dimensions[2] + z;
      if (!cells.has(cell)) cells.set(cell, cells.size);
      const id = cells.get(cell);
      remap[i] = id;
      ++weights[id];
      sums[id * 3] += vertices[p];
      sums[id * 3 + 1] += vertices[p + 1];
      sums[id * 3 + 2] += vertices[p + 2];
    }
    if (cells.size < 3) return null;
    const out = new Float32Array(cells.size * 3);
    for (let i = 0; i < out.length; ++i) out[i] = sums[i] / weights[Math.floor(i / 3)];

    const triangles = new Uint32Array(indices.length), seen = new Set();
    const numericKey = Number.isSafeInteger(cells.size ** 3);
    let written = 0;
    for (let i = 0; i < indices.length; i += 3) {
      const a = remap[indices[i]], b = remap[indices[i + 1]], c = remap[indices[i + 2]];
      if (a === b || b === c || a === c) continue;
      const min = Math.min(a, b, c), max = Math.max(a, b, c), mid = a + b + c - min - max;
      const key = numericKey ? (min * cells.size + mid) * cells.size + max : [min, mid, max].join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      triangles[written++] = a; triangles[written++] = b; triangles[written++] = c;
    }
    return written ? { vertices: out, indices: triangles.slice(0, written), bounds: vertexBounds(out) } : null;
  }

  function prepareMeshes(meshes) {
    const references = meshes.flatMap(mesh => [...mesh.variants.values()].map(variant => ({ mesh, variant })));
    const original = references.reduce((sum, { mesh, variant }) => sum + mesh.indices.length / 3 * variant.uses, 0);
    let distance = original <= triangleBudget ? 0 : 100;
    for (let pass = 0; pass < 7; ++pass) {
      let triangles = 0;
      for (const { mesh, variant } of references) {
        const geometry = distance ? simplifyMesh(mesh, distance / variant.scale) : mesh;
        variant.geometry = geometry;
        if (geometry) triangles += geometry.indices.length / 3 * variant.uses;
      }
      if (triangles <= triangleBudget) return true;
      distance *= Math.max(1.25, Math.sqrt(triangles / triangleBudget));
    }
    return false;
  }

  function terrainMesh(field, data, stride) {
    const { rows, columns, rowScale, columnScale, heightScale, samples } = field;
    const width = Math.ceil((columns - 1) / stride) + 1, height = Math.ceil((rows - 1) / stride) + 1;
    const vertices = new Float32Array(width * height * 3), indices = new Uint32Array((width - 1) * (height - 1) * 6);
    let vertex = 0, index = 0;
    for (let r = 0; r < height; ++r) {
      for (let c = 0; c < width; ++c) {
        const row = Math.min(r * stride, rows - 1), column = Math.min(c * stride, columns - 1);
        const sample = samples + (row * columns + column) * 4;
        // Heightfields use PhysX local axes. Their instance pose places them in UE world space.
        vertices[vertex++] = row * rowScale;
        vertices[vertex++] = data.getInt16(sample, true) * heightScale;
        vertices[vertex++] = column * columnScale;
        if (r + 1 === height || c + 1 === width) continue;
        const midRow = Math.min(row + Math.floor(stride / 2), rows - 2);
        const midColumn = Math.min(column + Math.floor(stride / 2), columns - 2);
        const materials = samples + (midRow * columns + midColumn) * 4 + 2;
        const top = r * width + c, bottom = top + width;
        if ((data.getUint8(materials) & 127) !== 127) {
          indices[index++] = top; indices[index++] = top + 1; indices[index++] = bottom;
        }
        if ((data.getUint8(materials + 1) & 127) !== 127) {
          indices[index++] = top + 1; indices[index++] = bottom + 1; indices[index++] = bottom;
        }
      }
    }
    return index ? { vertices, indices: indices.subarray(0, index), bounds: vertexBounds(vertices) } : null;
  }

  function prepareTerrain(fields, data) {
    const candidates = fields.filter(field => field.uses);
    const estimate = stride => candidates.reduce((sum, f) => sum +
      Math.ceil((f.rows - 1) / stride) * Math.ceil((f.columns - 1) / stride) * 2 * f.uses, 0);
    let stride = Math.max(1, Math.ceil(Math.sqrt(estimate(1) / terrainBudget)));
    while (stride < 4096 && estimate(stride) > terrainBudget) ++stride;
    if (estimate(stride) > terrainBudget) return false;
    for (const field of candidates) field.geometry = terrainMesh(field, data, stride);
    return true;
  }

  function extendBounds(bounds, local, basis, position) {
    for (let row = 0; row < 3; ++row) {
      let min = position[row], max = position[row];
      for (let column = 0; column < 3; ++column) {
        const scale = basis[row * 3 + column];
        const a = scale * local.minimum[column], b = scale * local.maximum[column];
        min += Math.min(a, b); max += Math.max(a, b);
      }
      if (!coordinate(min) || !coordinate(max)) return false;
      bounds.minimum[row] = Math.min(bounds.minimum[row], min);
      bounds.maximum[row] = Math.max(bounds.maximum[row], max);
    }
    return true;
  }

  function decodeModel(mapIndex, bytes) {
    const model = readModel(bytes);
    if (!model || !prepareMeshes(model.meshes) || !prepareTerrain(model.fields, model.data)) return null;
    const bounds = emptyBounds(), pending = [];
    let total = 0, terrain = 0;
    for (const instance of model.instances) {
      const { type, resource, basis, position, variant } = instance;
      const geometry = type === 0 ? variant.geometry : type === 1 ? resource.geometry : resource;
      if (!geometry) continue;
      const count = geometry.indices.length / 3;
      total += count;
      if (type === 1) terrain += count;
      if (total > maximumTriangles || !geometry.bounds || !extendBounds(bounds, geometry.bounds, basis, position)) return null;
      const tile = position.slice(0, 2).map(value => Math.floor(value / 16000));
      pending.push({ geometry, basis, position, tile });
    }
    if (!total) return null;
    pending.sort((a, b) => a.tile[0] - b.tile[0] || a.tile[1] - b.tile[1]);
    const origin = bounds.minimum.map((value, axis) => (value + bounds.maximum[axis]) / 2);
    const signature = ['dfcol-v1', mapIndex, model.checksum].join(':');
    const pages = [], pageCount = Math.ceil(total / pageTriangles);
    for (let page = 0; page < pageCount; ++page) {
      const count = Math.min(pageTriangles, total - page * pageTriangles);
      pages.push({ ...bounds, origin, signature, page, pages: pageCount, mapId: mapIndex, count, total, terrain,
        surfaces: false, vertices: new Float32Array(count * 9) });
    }

    let page = 0, out = 0;
    for (const { geometry, basis, position } of pending) {
      const [x, y, z] = position.map((value, axis) => value - origin[axis]);
      const vertices = geometry.vertices;
      for (const index of geometry.indices) {
        const at = index * 3, a = vertices[at], b = vertices[at + 1], c = vertices[at + 2];
        const buffer = pages[page].vertices;
        buffer[out++] = (basis[0] * a + basis[1] * b + basis[2] * c + x) * .01;
        buffer[out++] = (basis[3] * a + basis[4] * b + basis[5] * c + y) * .01;
        buffer[out++] = (basis[6] * a + basis[7] * b + basis[8] * c + z) * .01;
        if (out === buffer.length) { ++page; out = 0; }
      }
    }
    return pages;
  }

  if (typeof globalThis.importScripts === 'function' && typeof globalThis.document === 'undefined') {
    globalThis.addEventListener('message', ({ data }) => {
      let pages;
      try { pages = decodeModel(data.mapIndex, data.bytes); } catch (_) { pages = null; }
      globalThis.postMessage({ pages }, pages ? pages.map(page => page.vertices.buffer) : []);
    });
    return;
  }

  const workerUrl = globalThis.document?.currentScript?.src;
  let archive = null;

  async function downloadZip(state) {
    const response = await fetch(source.url, { signal: state.controller.signal, credentials: 'omit' });
    if (!response.ok || !response.body) return null;
    const length = response.headers.get('Content-Length');
    if (length !== null && Number(length) !== source.bytes) {
      await response.body.cancel().catch(() => {});
      return null;
    }
    const bytes = new Uint8Array(source.bytes), reader = response.body.getReader();
    let offset = 0, lastPercent = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.length > bytes.length - offset) {
          await reader.cancel().catch(() => {});
          return null;
        }
        bytes.set(value, offset);
        offset += value.length;
        const percent = Math.floor(offset * 100 / bytes.length);
        if (percent !== lastPercent) {
          lastPercent = percent;
          state.status = '下载 3D 模型包 ' + percent + '%';
          for (const report of state.listeners) report(state.status);
        }
      }
    } finally {
      reader.releaseLock();
    }
    return offset === bytes.length ? bytes : null;
  }

  function getArchive(signal, report) {
    if (signal?.aborted) return Promise.resolve(null);
    if (!archive || archive.controller.signal.aborted) {
      const request = { controller: new AbortController(), listeners: new Set(), status: '下载 3D 模型包 0%', complete: false };
      archive = request;
      request.result = downloadZip(request).catch(() => null).then(bytes => {
        request.complete = true;
        request.bytes = bytes;
        if (!bytes && archive === request) archive = null;
        return bytes;
      });
    }
    const request = archive;
    return new Promise(resolve => {
      const listener = status => report(status);
      const finish = bytes => {
        signal?.removeEventListener('abort', cancel);
        request.listeners.delete(listener);
        resolve(bytes);
      };
      const cancel = () => {
        finish(null);
        // A new map selection in the same event can reuse the current download.
        setTimeout(() => {
          if (!request.complete && !request.listeners.size) request.controller.abort();
        }, 0);
      };
      request.listeners.add(listener);
      signal?.addEventListener('abort', cancel, { once: true });
      if (!request.complete) report(request.status);
      request.result.then(finish);
    });
  }

  function unzipModel(zip, file, signal) {
    return new Promise(resolve => {
      if (signal?.aborted) { resolve(null); return; }
      let terminate, seen = false, invalid = false;
      const finish = bytes => {
        signal?.removeEventListener('abort', cancel);
        resolve(bytes);
      };
      const cancel = () => { terminate?.(); finish(null); };
      signal?.addEventListener('abort', cancel, { once: true });
      try {
        terminate = globalThis.fflate.unzip(zip, {
          filter({ name, compression, originalSize }) {
            if (name !== file) return false;
            if (seen || compression !== 8 || originalSize < headerSize || originalSize > maximumModelBytes) {
              invalid = true;
              return false;
            }
            seen = true;
            return true;
          },
        }, (error, files) => finish(error || invalid ? null : files?.[file]));
      } catch (_) { finish(null); }
    });
  }

  function buildPages(mapIndex, bytes, signal) {
    return new Promise(resolve => {
      if (signal?.aborted) { resolve(null); return; }
      let worker;
      const finish = result => {
        signal?.removeEventListener('abort', cancel);
        worker?.terminate();
        resolve(result);
      };
      const cancel = () => finish(null);
      try {
        worker = new Worker(workerUrl);
        worker.onmessage = ({ data }) => finish(data);
        worker.onerror = cancel;
        worker.onmessageerror = cancel;
        signal?.addEventListener('abort', cancel, { once: true });
        worker.postMessage({ mapIndex, bytes }, [bytes.buffer]);
      } catch (_) { finish(null); }
    });
  }

  async function load(mapIndex, { signal, onProgress = () => {} } = {}) {
    const file = Number.isInteger(mapIndex) && source.files[mapIndex];
    if (!file) return { error: '当前地图暂无 3D 模型' };
    if (typeof globalThis.fflate?.unzip !== 'function' || typeof globalThis.Worker !== 'function' || !workerUrl)
      return { error: '3D 模型加载组件不可用，请刷新页面' };
    const zip = await getArchive(signal, onProgress);
    if (signal?.aborted) return { canceled: true };
    if (!zip) return { error: '3D 模型包下载失败，请重试' };

    onProgress('解压当前地图…');
    const bytes = await unzipModel(zip, file, signal);
    if (signal?.aborted) return { canceled: true };
    if (!bytes) {
      if (archive?.bytes === zip) archive = null;
      return { error: '3D 模型包缺少当前地图或已损坏' };
    }

    onProgress('生成 3D 地图…');
    const result = await buildPages(mapIndex, bytes, signal);
    if (signal?.aborted) return { canceled: true };
    if (result?.pages?.length) return result;
    if (!result) return { error: '3D 模型处理组件不可用，请刷新页面' };
    if (archive?.bytes === zip) archive = null;
    return { error: '当前 3D 模型读取失败，请重试' };
  }

  globalThis.DfmRadarModelPack = { load };
})();

(() => {
  'use strict';

  function create({onModeChange, onFit, redraw}) {
    const byId = id => document.getElementById(id);
    const map = byId('map'), view = byId('scene-view'), canvas = byId('scene-canvas');
    const overlay = byId('scene-markers'), mode = byId('scene-mode');
    const status = byId('scene-status'), retry = byId('scene-retry'), fit = byId('scene-fit');
    let active = false, index = 0, renderer = null, pending = null, bounds = null, following = null;

    function message(text, error = false) {
      if (status.textContent !== text) status.textContent = text;
      status.hidden = !text;
      status.classList.toggle('error', error);
      retry.hidden = !error;
    }
    function reset() {
      pending?.abort();
      pending = null;
      bounds = following = null;
      fit.disabled = true;
      view.classList.remove('ready');
      renderer?.setVisible(false);
      renderer?.clear();
    }
    function failed(text) {
      reset();
      message(text, true);
    }
    async function load() {
      reset();
      const {UamRadar3D, DfmRadarModelPack} = globalThis;
      if (!UamRadar3D || !DfmRadarModelPack) {
        message('3D 组件未加载，请刷新页面', true);
        return;
      }
      renderer ??= UamRadar3D.create(canvas, overlay, failed);
      if (!renderer) return;
      const job = new AbortController();
      pending = job;
      try {
        const result = await DfmRadarModelPack.load(index, {
          signal: job.signal,
          onProgress: text => { if (pending === job) message(text); }
        });
        if (pending !== job) return;
        if (!result?.pages?.length) {
          failed(result?.error || '3D 模型加载失败，请重试');
          return;
        }
        for (const [pageNumber, page] of result.pages.entries()) {
          message(`正在绘制 3D 地图 ${pageNumber + 1} / ${result.pages.length}`);
          await new Promise(resolve => requestAnimationFrame(resolve));
          if (pending !== job) return;
          if (!renderer.addPage(page)) {
            failed('3D 图形资源暂不可用，请重试或切回 2D');
            return;
          }
        }
        const {minimum, maximum} = result.pages[0];
        bounds = {minimum, maximum};
        pending = null;
        fit.disabled = false;
        view.classList.add('ready');
        renderer.fit();
        renderer.setVisible(true);
        message('');
        redraw();
      } catch {
        if (pending === job) failed('3D 模型加载失败，请重试');
      }
    }
    function setMode() {
      const enabled = mode.value === '3d';
      if (active === enabled) return;
      active = enabled;
      map.hidden = enabled;
      view.hidden = !enabled;
      onModeChange(enabled);
      if (enabled) void load();
      else reset();
    }
    function absolutePosition(origin, point) {
      if (!point || ![point.x, point.y, point.z].every(Number.isFinite)) return null;
      const x = point.x + origin[0], y = point.y + origin[1], z = point.z + origin[2];
      // A frame from another map must not pull the camera away from the selected geometry.
      const margin = 3000;
      if (x < bounds.minimum[0] - margin || x > bounds.maximum[0] + margin ||
          y < bounds.minimum[1] - margin || y > bounds.maximum[1] + margin) return null;
      return {x, y, z};
    }
    function markerNode(marker) {
      const root = document.createElement('div');
      root.className = 'scene-marker';
      root.hidden = true;
      const pin = document.createElement('div');
      pin.className = 'scene-marker-pin ' + marker.kind;
      pin.textContent = marker.team ?? '';
      root.appendChild(pin);
      if (marker.label || marker.details || Number.isFinite(marker.health)) {
        const label = document.createElement('div');
        label.className = 'scene-marker-label';
        label.textContent = [marker.label, marker.details].filter(Boolean).join(' · ');
        root.appendChild(label);
        if (Number.isFinite(marker.health)) {
          const bar = document.createElement('span');
          bar.className = 'scene-marker-health';
          bar.style.setProperty('--health', Math.max(0, Math.min(100, marker.health)) + '%');
          label.appendChild(bar);
        }
      }
      return root;
    }

    mode.disabled = false;
    mode.addEventListener('change', setMode);
    retry.addEventListener('click', () => { if (active) void load(); });
    fit.addEventListener('click', () => { onFit(); renderer?.fit(); });
    addEventListener('resize', () => renderer?.resize());
    addEventListener('pagehide', () => { reset(); renderer?.dispose(); renderer = null; });
    addEventListener('pageshow', event => { if (event.persisted && active) void load(); });
    canvas.addEventListener('webglcontextrestored', () => {
      setTimeout(() => { if (active) void load(); }, 0);
    });

    return {
      get active() { return active; },
      setMap(next) {
        if (index === next) return;
        index = next;
        if (active) void load();
      },
      update(origin, markers, focus = null) {
        if (!bounds) return 0;
        const positioned = Array.isArray(origin) && origin.length === 3 && origin.every(Number.isFinite);
        const items = [];
        if (positioned) for (const marker of markers) {
          const point = absolutePosition(origin, marker);
          if (point) items.push({...point, node: markerNode(marker)});
        }
        message(origin && !positioned ? '等待带高度和世界原点的雷达数据' : '');
        const target = positioned ? absolutePosition(origin, focus) : null;
        const key = target ? focus.id : null;
        if (key !== following) {
          following = key;
          if (target) renderer.follow();
          else renderer.fit();
        }
        renderer.update(target, items);
        return items.length;
      }
    };
  }

  globalThis.DfmRadarScene = { create };
})();

