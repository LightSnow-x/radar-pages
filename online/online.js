'use strict';
(()=>{
  const byId=id=>document.getElementById(id);
  const connection=byId('connection'),refresh=byId('refresh'),notice=byId('notice');
  const search=byId('search'),sort=byId('sort'),onlyOnline=byId('only-online');
  let latest=null,busy=false,renderedKey='';
  const number=new Intl.NumberFormat('zh-CN');
  const games={
    dfm:{english:'Delta Force',image:'dfm.ico',site:'https://df.qq.com/'},
    uam:{english:'Arena Breakout',image:'uam.png',site:'https://aqtw.qq.com/'},
    codm:{english:'Call of Duty Mobile',image:'codm.png',site:'https://codm.qq.com/'},
    cfm:{english:'CrossFire Mobile',image:'cfm.png',site:'https://cfm.qq.com/'},
    pve:{english:'Mini World Royale',image:'pve.ico',site:'https://www.minifire.cn/'},
    sgame:{english:'Honor of Kings',image:'sgame.ico',site:'https://www.honorofkings.com/'},
    yhtj:{english:'Lost Light',image:'yhtj.png',site:'https://yhtj.163.com/'},
    lolm:{english:'League of Legends: Wild Rift',image:'lolm.svg',site:'https://lolm.qq.com/'},
    valorant:{english:'Valorant Mobile',image:'valorant.png',site:'https://valm.qq.com/'}
  };
  function node(tag,className,text) {
    const element=document.createElement(tag);element.className=className;
    if(text!==undefined)element.textContent=text;
    return element;
  }
  function icon(name) {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','icon');svg.setAttribute('aria-hidden','true');
    const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#i-'+name);svg.append(use);
    return svg;
  }
  function render() {
    if(!latest)return;
    const key=JSON.stringify([latest.branches,search.value,sort.value,onlyOnline.checked]);
    if(key===renderedKey)return;
    renderedKey=key;
    const query=search.value.trim().toLocaleLowerCase();
    const rows=latest.branches.filter(row=>(!onlyOnline.checked||row.online>0)&&
      (!query||(row.game+' '+row.region+' '+row.id).toLocaleLowerCase().includes(query)));
    if(sort.value==='online')rows.sort((a,b)=>b.online-a.online);
    const grouped=new Map();
    for(const row of rows) {
      const id=row.id.split('-')[0];
      if(!grouped.has(id))grouped.set(id,{id,name:row.game,rows:[],online:0});
      const game=grouped.get(id);game.rows.push(row);game.online+=row.online;
    }
    const groups=[...grouped.values()];
    if(sort.value==='online')groups.sort((a,b)=>b.online-a.online);
    const fragment=document.createDocumentFragment();
    for(const group of groups) {
      const metadata=Object.hasOwn(games,group.id)?games[group.id]:{english:group.id,image:'black-snow.svg'};
      const card=node('article','game-card'+(group.online?' has-online':''));card.dataset.game=group.id;
      card.setAttribute('role','listitem');card.setAttribute('aria-label',group.name);
      const header=node('div','game-card-header'),imageWrap=node('span','game-icon-wrap'),image=node('img','game-icon');
      image.src='./online-icons/'+metadata.image;image.alt='';image.width=48;image.height=48;image.dataset.game=group.id;
      imageWrap.append(image);
      const title=node('div','game-title'),link=node(metadata.site?'a':'span','',group.name);
      if(metadata.site){link.href=metadata.site;link.target='_blank';link.rel='noopener noreferrer';link.title=group.name+' 官网';link.append(icon('external'));}
      title.append(link,node('span','',metadata.english));
      const total=node('div','game-total');total.append(node('strong','',number.format(group.online)),node('span','','在线'));
      header.append(imageWrap,title,total);
      const branches=node('div','game-branches');
      for(const row of group.rows) {
        const branch=node('div','branch-row');branch.dataset.branch=row.id;branch.title=row.id;
        branch.append(icon('globe'),node('span','region-name',row.region),
          node('span','branch-status'+(row.online?' online':''),row.online?'在线':'暂无在线'),
          node('strong','branch-count'+(row.online?' online':''),number.format(row.online)));
        branches.append(branch);
      }
      card.append(header,branches);fragment.append(card);
    }
    byId('branches').replaceChildren(fragment);
    byId('game-count').textContent=groups.length;
    byId('result-count').textContent='显示 '+rows.length+' / '+latest.branches.length+' 个分支';
    byId('empty').hidden=rows.length>0;
    byId('empty-message').textContent=onlyOnline.checked&&!query?'目前没有在线分支':'没有匹配的游戏分支';
  }
  function valid(data) {
    return data&&data.v===1&&Number.isFinite(Date.parse(data.updatedAt))&&Array.isArray(data.branches)&&
      data.branches.length>0&&data.branches.length<=100&&data.branches.every(row=>row&&
        ['id','game','region'].every(key=>typeof row[key]==='string'&&row[key].length>0)&&
        Number.isSafeInteger(row.online)&&row.online>=0)&&
      new Set(data.branches.map(row=>row.id)).size===data.branches.length&&
      data.total===data.branches.reduce((sum,row)=>sum+row.online,0)&&
      data.activeBranches===data.branches.filter(row=>row.online>0).length;
  }
  async function update() {
    if(busy)return;
    busy=true;refresh.disabled=true;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
    try {
      const response=await RadarPages.fetch('/api/worker/online',{cache:'no-store',signal:controller.signal});
      if(!response.ok)throw new Error('Statistics unavailable');
      const data=await response.json();
      if(!valid(data))throw new Error('Invalid statistics');
      latest=data;
      byId('total').textContent=number.format(data.total);byId('active').textContent=number.format(data.activeBranches);
      byId('branch-count').textContent=data.branches.length;
      byId('updated').textContent=new Date(data.updatedAt).toLocaleTimeString('zh-CN',{hour12:false});
      byId('updated').title=new Date(data.updatedAt).toLocaleString('zh-CN');
      byId('refresh-note').textContent='每 5 秒自动刷新';
      connection.textContent='实时同步中';connection.dataset.state='live';notice.hidden=true;
      render();
    } catch(_) {
      connection.textContent='同步已中断';connection.dataset.state='stale';notice.hidden=false;
      notice.textContent=latest?'连接暂时不可用，以下为上次成功同步的数据，当前人数可能已变化。正在自动重试。':'暂时无法获取统计数据，正在自动重试。';
      byId('refresh-note').textContent=latest?'上次成功同步时间':'等待连接恢复';
      if(!latest){byId('empty-message').textContent='连接恢复后将自动显示各分支人数';byId('result-count').textContent='等待数据';}
    } finally {clearTimeout(timeout);busy=false;refresh.disabled=false;}
  }
  search.addEventListener('input',render);sort.addEventListener('change',render);onlyOnline.addEventListener('change',render);
  refresh.addEventListener('click',update);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void update();});
  void update();setInterval(()=>{if(!document.hidden)void update();},5000);
})();
