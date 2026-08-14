// @ts-nocheck -- Literal port of the legacy build's JavaScript.
// This module and map.ts build SVG DOM / a WebGL scene leaning on JS's implicit
// number-to-string coercion in setAttribute, exactly as the original did.
// Typing them would mean rewriting hundreds of call sites and would put the
// visual parity this migration is bound to at risk. The rest of the project
// (src/lib, components, pages and the other islands) does pass `npm run check`.
/**
 * 3D recreation of a node's interior, built by interpreting the floor plan and
 * elevations in the pliego. It is NOT a photograph nor a real model: the notice
 * for that lives in the viewer's header.
 *
 * three comes from npm at a pinned version; the legacy loaded it from a CDN
 * (r128). r128 predates colour management and the lighting rework, so
 * ColorManagement is disabled and linear output forced to keep the room looking
 * the way it did.
 */
import * as THREE from 'three';
import type { NetworkNode } from '../lib/data';

THREE.ColorManagement.enabled = false;

let SV: { stop(): void } | null = null;

/** Stops the render loop and releases the current room's resources. */
export function stopRoom() {
  if (SV) { SV.stop(); SV = null; }
}

export function buildRoom(n: NetworkNode){
  stopRoom();
  const canvas=document.getElementById('svCanvas') as HTMLCanvasElement;
  const holder=canvas.parentElement!;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
  /* linear output, as in r128: the palette was chosen against it */
  renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x0b1322);

  /* ---- real enclosures from the pliego ---- */
  const ROOMS={
    tineo:   {w:7.6,d:4.6,h:3.0, type:'local',   desc:'bajo comercial de 35 m\u00b2'},
    cangas:  {w:5.2,d:3.2,h:2.5, type:'caseta',  desc:'caseta de obra, planta superior de 16 m\u00b2 con chafl\u00e1n y viga'},
    mieres:  {w:8.2,d:4.6,h:2.85,type:'local',   desc:'bajo comercial de 57 m\u00b2 (37 \u00fatiles), 2,85 m'},
    polalena:{w:5.2,d:3.2,h:2.85,type:'local',   desc:'planta de edificio de viviendas, 16 m\u00b2 \u00fatiles'},
    blimea:  {w:7.6,d:4.6,h:2.4, type:'local',   desc:'bajo de edificio de 35 m\u00b2 con falso suelo practicable'},
    pao:     {w:13.5,d:7.5,h:2.5,type:'pao',     desc:'local de 243 m\u00b2 (214 \u00fatiles) con jaulas de aluminio y cristal'}
  };
  const R=ROOMS[n.id]||{w:3.8,d:2.7,h:2.35,type:'contenedor',desc:'contenedor prefabricado de 10 m\u00b2 (6 \u00fatiles), 2,40 m'};
  const {w:W,d:D,h:H}=R;
  const isBig=R.type!=='contenedor';
  const nOLT=Math.max(n.olts.length,1);
  scene.fog=new THREE.Fog(0x0b1322, Math.max(W,D)*1.3, Math.max(W,D)*3.6);
  const cam=new THREE.PerspectiveCamera(70,1,.05,100);
  cam.position.set(0,1.6,D/2-0.55);

  /* ---- procedural textures per enclosure type ---- */
  function cv(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'));const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t;}
  const floorTex = R.type==='blimea_never' ? null : cv(512,512,g=>{
    if(n.id==='blimea'){ /* raised access floor: 60x60 tiles */
      g.fillStyle='#7d8289';g.fillRect(0,0,512,512);
      g.strokeStyle='#3a3f47';g.lineWidth=4;
      for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*128,0);g.lineTo(i*128,512);g.stroke();g.beginPath();g.moveTo(0,i*128);g.lineTo(512,i*128);g.stroke();}
      for(let x=64;x<512;x+=128)for(let y=64;y<512;y+=128){g.fillStyle='#6d7279';g.fillRect(x-6,y-6,12,12);}
    }else{
      g.fillStyle=R.type==='contenedor'?'#96938c':'#8d9199';g.fillRect(0,0,512,512);
      for(let i=0;i<2600;i++){g.fillStyle=`rgba(${60+Math.random()*40|0},${60+Math.random()*40|0},${70+Math.random()*40|0},.15)`;g.fillRect(Math.random()*512,Math.random()*512,2,2);}
      g.strokeStyle='rgba(40,44,52,.4)';g.lineWidth=2;
      for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*128,0);g.lineTo(i*128,512);g.stroke();g.beginPath();g.moveTo(0,i*128);g.lineTo(512,i*128);g.stroke();}
    }
  });
  floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(W/1.4,D/1.4);
  const wallTex=cv(256,256,g=>{
    if(R.type==='contenedor'){g.fillStyle='#cfd4d8';g.fillRect(0,0,256,256);g.fillStyle='rgba(150,158,166,.55)';for(let x=0;x<256;x+=30)g.fillRect(x,0,4,256);}
    else if(R.type==='caseta'){g.fillStyle='#d3cfc4';g.fillRect(0,0,256,256);g.strokeStyle='rgba(140,132,118,.5)';g.lineWidth=2;for(let y=0;y<256;y+=42){g.strokeRect(-10+((y/42)%2)*32,y,64,42);g.strokeRect(54+((y/42)%2)*32,y,64,42);g.strokeRect(118+((y/42)%2)*32,y,64,42);g.strokeRect(182+((y/42)%2)*32,y,64,42);}}
    else if(R.type==='pao'){g.fillStyle='#dee0e3';g.fillRect(0,0,256,256);g.fillStyle='rgba(170,175,182,.3)';g.fillRect(0,190,256,66);}
    else{g.fillStyle='#d8d5cd';g.fillRect(0,0,256,256);g.fillStyle='rgba(160,155,145,.25)';for(let y=0;y<256;y+=64)g.fillRect(0,y,256,2);}
  });
  const meshTex=cv(128,128,g=>{
    g.clearRect(0,0,128,128);
    g.strokeStyle='rgba(74,158,94,.85)';g.lineWidth=2.4;
    for(let i=-128;i<256;i+=16){g.beginPath();g.moveTo(i,0);g.lineTo(i+128,128);g.stroke();g.beginPath();g.moveTo(i+128,0);g.lineTo(i,128);g.stroke();}
  });
  meshTex.wrapS=meshTex.wrapT=THREE.RepeatWrapping;
  const mat={
    floor:new THREE.MeshLambertMaterial({map:floorTex}),
    wall:new THREE.MeshLambertMaterial({map:wallTex}),
    ceil:new THREE.MeshLambertMaterial({color:0x9aa0a8}),
    rack:new THREE.MeshLambertMaterial({color:0x2e3238}),
    rackNew:new THREE.MeshLambertMaterial({color:0x1a2733}),
    chAlc:new THREE.MeshLambertMaterial({color:0xb9bec6}),
    chEri:new THREE.MeshLambertMaterial({color:0x3a4d6e}),
    chNew:new THREE.MeshLambertMaterial({color:0x11313a}),
    card:new THREE.MeshLambertMaterial({color:0x556072}),
    metal:new THREE.MeshLambertMaterial({color:0xb8bcc2}),
    cabinet:new THREE.MeshLambertMaterial({color:0xd0d3d8}),
    bat:new THREE.MeshLambertMaterial({color:0x23262c}),
    fiber:new THREE.MeshBasicMaterial({color:0xf2d024}),
    tray:new THREE.MeshLambertMaterial({color:0x8a9099}),
    door:new THREE.MeshLambertMaterial({color:0x6f7680}),
    dark:new THREE.MeshLambertMaterial({color:0x14181f}),
    glass:new THREE.MeshLambertMaterial({color:0xaad4e8,transparent:true,opacity:.16,side:THREE.DoubleSide}),
    mesh:new THREE.MeshBasicMaterial({map:meshTex,transparent:true,side:THREE.DoubleSide}),
    rackLight:new THREE.MeshLambertMaterial({color:0xd8dade}),
    gband:new THREE.MeshLambertMaterial({color:0xf0ede6}),
    tabOr:new THREE.MeshLambertMaterial({color:0xd4763a}),
    redStripe:new THREE.MeshLambertMaterial({color:0xd84a4a}),
    alu:new THREE.MeshLambertMaterial({color:0xc9cdd2}),
    beam:new THREE.MeshLambertMaterial({color:0xb5aa96})
  };
  function box(w,h,d,m,x,y,z,parent){
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
    b.position.set(x,y,z);(parent||scene).add(b);return b;
  }
  function label(text,wm,x,y,z,ry,size,color){
    const t=cv(512,96,g=>{g.clearRect(0,0,512,96);
      g.fillStyle=color||'#20242a';g.font='600 44px monospace';g.textAlign='center';g.fillText(text,256,62);});
    const p=new THREE.Mesh(new THREE.PlaneGeometry(wm,wm*96/512),new THREE.MeshBasicMaterial({map:t,transparent:true}));
    p.position.set(x,y,z);if(ry)p.rotation.y=ry;scene.add(p);return p;
  }

  /* ---- room ---- */
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,D),mat.floor);floor.rotation.x=-Math.PI/2;scene.add(floor);
  const ceil=new THREE.Mesh(new THREE.PlaneGeometry(W,D),mat.ceil);ceil.rotation.x=Math.PI/2;ceil.position.y=H;scene.add(ceil);
  function wallP(w,x,z,ry){const p=new THREE.Mesh(new THREE.PlaneGeometry(w,H),mat.wall);p.position.set(x,H/2,z);p.rotation.y=ry;scene.add(p);}
  wallP(W,0,-D/2,0); wallP(W,0,D/2,Math.PI); wallP(D,-W/2,0,Math.PI/2); wallP(D,W/2,0,-Math.PI/2);
  /* Cangas: corner chamfer + beam */
  if(n.id==='cangas'){
    const ch=new THREE.Mesh(new THREE.PlaneGeometry(1.4,H),mat.wall);
    ch.position.set(-W/2+.45,H/2,-D/2+.45);ch.rotation.y=Math.PI/4;scene.add(ch);
    box(W,.3,.35,mat.beam,0,H-.15,-0.3);
    label('viga',0.4,0,H-.34,-0.28+0.19,0,0,'#7a705e');
  }
  const doorX=W/2-0.95;
  box(1.14,2.22,.1,mat.alu,doorX,1.11,D/2-0.02);                 /* frame */
  box(1.0,2.08,.07,mat.door,doorX,1.04,D/2-0.055);               /* leaf */
  box(.06,.06,.05,new THREE.MeshLambertMaterial({color:0x2b2f36}),doorX-0.38,1.02,D/2-0.10); /* handle */
  box(.9,.02,.02,new THREE.MeshLambertMaterial({color:0x565e68}),doorX,0.28,D/2-0.10);       /* kick plate */
  label('SALIDA',0.5,doorX,2.34,D/2-0.06,Math.PI,0,'#2a5c55');

  scene.add(new THREE.AmbientLight(0xf2f4f6,.55));
  const dl=new THREE.DirectionalLight(0xffffff,.5);dl.position.set(2,4,2);scene.add(dl);
  const nLum=Math.max(2,Math.round(D/2));
  for(let i=0;i<nLum;i++){
    const z=-D/2+(i+.5)*D/nLum;
    box(1.3,.06,.16,new THREE.MeshBasicMaterial({color:0xeef6f4}),0,H-.04,z);
  }
  box(W*.86,.05,.3,mat.tray,0,H-.26,isBig?-D/2+1.0:0);
  box(W*.84,.05,.12,new THREE.MeshLambertMaterial({color:0x3f4650}),0,H-.22,isBig?-D/2+1.0:0);

  const leds=[];
  function led(x,y,z,parent,base){
    const l=new THREE.Mesh(new THREE.PlaneGeometry(.02,.012),
      new THREE.MeshBasicMaterial({color:base||0x39ff88}));
    l.position.set(x,y,z);(parent||scene).add(l);
    leds.push({m:l,ph:Math.random()*6.28,base:base||0x39ff88});return l;
  }

  function oltRack(x,z,ry,code,vendor,cards,renew,wide){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);
    const rh=Math.min(H-0.3, isBig?2.1:2.0), rw=wide?0.9:0.6;
    const rackMat=renew?mat.rackNew:(R.type==='pao'?mat.rackLight:mat.rack);
    box(rw,rh,.6,rackMat,0,rh/2,0,g);
    if(R.type==='pao'&&!renew){ /* light perforated door, as in the photo */
      const perf=cv(64,64,q=>{q.fillStyle='#cfd2d7';q.fillRect(0,0,64,64);q.fillStyle='#aeb2b8';
        for(let yy=4;yy<64;yy+=8)for(let xx=4;xx<64;xx+=8)q.beginPath(),q.arc(xx,yy,1.6,0,7),q.fill();});
      perf.wrapS=perf.wrapT=THREE.RepeatWrapping;perf.repeat.set(2,6);
      const dporta=new THREE.Mesh(new THREE.PlaneGeometry(rw-.04,rh-.06),new THREE.MeshLambertMaterial({map:perf}));
      dporta.position.set(0,rh/2, -0.302);dporta.rotation.y=Math.PI;g.add(dporta);
    }
    /* GENBAND: cream chassis with vertical orange-tabbed cards (from the PAO photo) */
    if(code.indexOf('GENBAND')===0){
      box(rw-.08,0.85,.06,mat.gband,0,1.05,.31,g);
      for(let ci=0;ci<18;ci++){
        const cxx=-(rw/2-.08)+ci*((rw-.16)/17);
        box(.016,.72,.02,new THREE.MeshLambertMaterial({color:0xdedbd2}),cxx,1.05,.345,g);
        box(.014,.05,.015,mat.tabOr,cxx,0.73,.35,g);
      }
      box(rw-.1,.16,.05,mat.gband,0,1.62,.31,g);
      led(-(rw/2-.12),1.62,.34,g,0x39ff88);
      const lgb=label(code,0.6,0,rh+0.12,0.02,0,0,'#dfe6ee');scene.remove(lgb);g.add(lgb);
      for(let i=0;i<3;i++){
        const cur=new THREE.CatmullRomCurve3([
          new THREE.Vector3(-.1+i*.1,1.5,.35),new THREE.Vector3(-.05+i*.1,rh+.06,.3),
          new THREE.Vector3(0,H-.28,0)]);
        g.add(new THREE.Mesh(new THREE.TubeGeometry(cur,14,.008,5),mat.fiber));
      }
      return g;
    }
    const chH=renew?0.9:0.34, nCh=renew?1:Math.min(Math.ceil(cards/16),3);
    for(let i=0;i<nCh;i++){
      const y=0.55+i*(chH+0.14);
      box(rw-.1,chH,.05,renew?mat.chNew:(vendor.includes('Alcatel')?mat.chAlc:mat.chEri),0,y,.31,g);
      const slots=renew?12:8;
      for(let si=0;si<slots;si++){
        const sx=-(rw/2-.09)+si*((rw-.18)/(slots-1));
        box(.02,chH*.8,.012,mat.card,sx,y,.335,g);
        led(sx,y+chH*.32,.345,g,renew?0x41e3d2:(Math.random()<.06?0xffb347:0x39ff88));
      }
    }
    /* patch cords: they climb the rack from the chassis front and land on the tray */
    const topCh=0.55+(nCh-1)*(chH+0.14)+chH/2;      /* top edge of the last chassis */
    for(let i=0;i<3;i++){
      const fx=-.15+i*.15;
      const cur=new THREE.CatmullRomCurve3([
        new THREE.Vector3(fx, topCh, .345),
        new THREE.Vector3(fx, rh+.06, .30),
        new THREE.Vector3(fx*.5, Math.min(H-.30,rh+.5), .12),
        new THREE.Vector3(0, H-.28, 0)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(cur,16,.008,5),mat.fiber));
    }
    const lb=label(code,0.55,0,rh+0.12,0.02,0,0,'#dfe6ee');scene.remove(lb);g.add(lb);
    return g;
  }
  function energia(x,z,ry){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);
    box(.65,Math.min(1.9,H-.4),.5,mat.cabinet,0,Math.min(1.9,H-.4)/2,0,g);
    for(let i=0;i<4;i++){box(.5,.06,.02,mat.dark,0,.5+i*.36,.26,g);led(.2,.5+i*.36,.28,g,0x39ff88);}
    box(.7,.35,.5,mat.metal,0.85,.35,0,g);
    box(.3,.28,.42,mat.bat,0.72,.66,0,g); box(.3,.28,.42,mat.bat,1.0,.66,0,g);
    const l1=label('ENERG\u00cdA CC',0.6,0,Math.min(2.0,H-.3),0.05,0,0,'#dfe6ee');scene.remove(l1);g.add(l1);
    const l2=label('BATER\u00cdAS',0.5,0.86,0.9,0.05,0,0,'#dfe6ee');scene.remove(l2);g.add(l2);
  }
  function odf(x,z,ry){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);
    box(.55,1.5,.28,mat.cabinet,0,1.05,0,g);
    if(R.type==='pao')box(.55,.1,.29,mat.redStripe,0,1.74,0,g);
    for(let i=0;i<5;i++)box(.45,.05,.02,mat.dark,0,.55+i*.22,.15,g);
    for(let i=0;i<4;i++){
      const cur=new THREE.CatmullRomCurve3([
        new THREE.Vector3(-.18+i*.12,.57,.16),new THREE.Vector3(-.14+i*.12,.32,.28),
        new THREE.Vector3(-.1+i*.12,.57,.16)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(cur,10,.007,5),mat.fiber));
    }
    const l=label('REPARTIDOR F.O.',0.55,0,Math.min(1.85,H-.35),0.03,0,0,'#dfe6ee');scene.remove(l);g.add(l);
  }
  function catv(x,z,ry){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);
    box(.6,Math.min(1.8,H-.4),.5,mat.rack,0,Math.min(1.8,H-.4)/2,0,g);
    box(.5,.3,.05,mat.metal,0,1.3,.26,g); led(.18,1.3,.29,g,0xff5d5d);
    box(.5,.2,.05,mat.metal,0,.92,.26,g);
    const l=label('CATV \u00b7 SPLITTER V\u00cdDEO',0.62,0,Math.min(1.95,H-.3),0.03,0,0,'#dfe6ee');scene.remove(l);g.add(l);
  }
  function transporte(x,z,ry,txt){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);
    box(.6,1.4,.5,mat.rack,0,.7,0,g);
    for(let i=0;i<3;i++){box(.5,.12,.05,mat.chEri,0,.5+i*.3,.26,g);led(.2,.5+i*.3,.29,g,0x41e3d2);led(.14,.5+i*.3,.29,g,0x39ff88);}
    const l=label(txt,0.6,0,1.55,0.03,0,0,'#dfe6ee');scene.remove(l);g.add(l);
  }
  /* operator cage: aluminium and glass partitions (PAO) */
  function jaula(x,z,wj,dj,name,color){
    const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
    const hj=2.2;
    [[-wj/2,0],[wj/2,0]].forEach(([px])=>{
      box(.05,hj,.05,mat.alu,px,hj/2,-dj/2,g);box(.05,hj,.05,mat.alu,px,hj/2,dj/2,g);
    });
    const front=new THREE.Mesh(new THREE.PlaneGeometry(wj,hj),mat.mesh);front.position.set(0,hj/2,dj/2);g.add(front);
    front.material=front.material.clone();front.material.map=front.material.map.clone();front.material.map.repeat.set(wj*1.6,hj*1.6);front.material.map.needsUpdate=true;
    box(wj,.05,.05,mat.alu,0,hj,dj/2,g);box(wj,.05,.05,mat.alu,0,1.0,dj/2,g);
    const sideL=new THREE.Mesh(new THREE.PlaneGeometry(dj,hj),mat.mesh);sideL.position.set(-wj/2,hj/2,0);sideL.rotation.y=Math.PI/2;g.add(sideL);
    sideL.material=sideL.material.clone();sideL.material.map=sideL.material.map.clone();sideL.material.map.repeat.set(dj*1.6,hj*1.6);sideL.material.map.needsUpdate=true;
    /* the operator's rack inside */
    box(.5,1.9,.5,mat.rack,0,.95,-dj/2+.45,g);
    for(let i=0;i<3;i++){box(.4,.14,.04,mat.card,0,.5+i*.5,-dj/2+.71,g);led(.14,.5+i*.5,-dj/2+.74,g,0x39ff88);}
    /* operator nameplate */
    const t=cv(512,110,g2=>{g2.fillStyle='#20242a';g2.fillRect(0,0,512,110);
      g2.fillStyle=color;g2.font='700 52px monospace';g2.textAlign='center';g2.fillText(name,256,72);});
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(wj*.85,wj*.85*110/512),new THREE.MeshBasicMaterial({map:t}));
    sign.position.set(0,hj+.16,dj/2-.02);g.add(sign);
    return g;
  }
  function panels(){
    box(.55,.8,.12,mat.cabinet,-W/2+.08,1.5,-D/4,null);
    label('C. GEN',0.4,-W/2+.16,Math.min(2.0,H-.3),-D/4,Math.PI/2,0,'#dfe6ee');
    box(.45,.5,.1,mat.cabinet,-W/2+.07,1.45,D/4);led(-W/2+.13,1.6,D/4,null,0xffb347);
    label('ALARMAS',0.42,-W/2+.16,1.82,D/4,Math.PI/2,0,'#dfe6ee');
    box(.9,.32,.22,mat.cabinet,0,H-.5,D/2-.14);
    box(.8,.05,.02,mat.dark,0,H-.44,D/2-.25);
    label('CLIMA',0.4,0,H-.72,D/2-.27,Math.PI,0,'#5b6672');
  }
  panels();

  /* ---- interpreted layout ---- */
  let oldRacks=[];
  const vendor0=n.olts[0]?n.olts[0][1]:'Alcatel 7342';
  const activePorts=n.olts.reduce((a,o)=>a+o[2],0);
  const nODF=Math.max(1,Math.min(4,Math.round(activePorts/18)));

  if(R.type==='pao'){
    /* GIT: left half · operators: row of cages to the right and at the back */
    oldRacks.push(oltRack(-W/2+2.0,-D/2+1.4,0,'7750SR-7 \u00b7 100%','Alcatel 7342',48,false,true));
    transporte(-W/2+3.2,-D/2+1.35,0,'CWDM 8133 OCC');
    transporte(-W/2+4.1,-D/2+1.35,0,'CWDM 8140 SUROCC');
    transporte(-W/2+5.0,-D/2+1.35,0,'CWDM 8133 SE/OR');
    const gb=oltRack(-W/2+0.9,-D/2+1.4,0,'GENBAND V5.2 (POTS)','Ericsson',16,false);
    oldRacks.push(gb);
    for(let i=0;i<3;i++)odf(-W/2+0.8+i*0.85,D/2-0.6,Math.PI);
    energia(-W/2+.55,1.1,Math.PI/2);
    /* OLT test mock-ups */
    oldRacks.push(oltRack(-W/2+2.0,0.6,0,'MAQUETA A7342','Alcatel 7342',8,false));
    oldRacks.push(oltRack(-W/2+2.9,0.6,0,'MAQUETA BLM1500','Ericsson',8,false));
    /* operator cages (aluminium+glass partitions, section 3.1.3 of the pliego) */
    const OPS=[['TELEFONICA','#7ec8ff'],['VODAFONE','#ff6b6b'],['ORANGE','#ffb347'],['TELECABLE','#6bd6c1'],['ADAMO','#9db4ff'],['DIGI','#ff8fb2'],['CONECTA-T','#c9f06b'],['SESTAFERIA.NET','#ffd76b'],['OPERIAX','#c9a0ff'],['COGENT','#a8b6c8']];
    const wj=1.25,dj=2.0;
    OPS.forEach(([name,col],i)=>{
      const perRow=5, r=Math.floor(i/perRow), c=i%perRow;
      const x=W/2-0.9-c*(wj+0.18);
      const z=-D/2+1.2+r*(dj+0.7);
      jaula(x,z,wj,dj,name,col);
    });
    for(let bi=0;bi<3;bi++){
      const bx=-W/2+1.45+bi*1.15;
      const cur=new THREE.CatmullRomCurve3([
        new THREE.Vector3(bx,0.12,-D/2+1.05),
        new THREE.Vector3(bx+.04,H*0.5,-D/2+1.02),
        new THREE.Vector3(bx,H-.30,-D/2+1.0)]);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(cur,14,.03,7),mat.fiber));
    }
    label('ZONA GIT',0.9,-W/2+2.6,H-.35,-D/2+.05,0,0,'#5b6672');
    label('JAULAS DE OPERADORES',1.4,W/2-3.4,H-.35,-D/2+.05,0,0,'#5b6672');
  }
  else if(!isBig){
    odf(-W/2+.45,-1.0,Math.PI/2);
    n.olts.forEach((o,i)=>{oldRacks.push(oltRack(-W/2+.45,-0.35+i*0.66,Math.PI/2,o[0],o[1],o[2],false));});
    if(n.olts.length<2)transporte(-W/2+.45,0.32,Math.PI/2, n.id==='muros'?'CWDM 8133 \u00d72':'TRANSMODE / CWDM');
    catv(-W/2+.45,1.0,Math.PI/2);
    energia(W/2-.6,-0.3,-Math.PI/2);
  }
  else{
    const perRow=4, rows=Math.ceil(nOLT/perRow);
    n.olts.forEach((o,i)=>{
      const r=Math.floor(i/perRow), c=i%perRow, inRow=Math.min(nOLT-r*perRow,perRow);
      const x=(c-(inRow-1)/2)*0.95;
      const z=-D/2+1.6+r*1.6;
      oldRacks.push(oltRack(x,z,0,o[0],o[1],o[2],false));
    });
    for(let i=0;i<nODF;i++)odf(-W/2+0.7+i*0.75,-D/2+.45,0);
    transporte(W/2-1.2,-D/2+.45,0, n.id==='blimea'?'FILA EWDM':'TRANSMODE 5800');
    energia(-W/2+.55,D/2-1.4,Math.PI/2);
    catv(W/2-.45,0.6,-Math.PI/2);
    if(n.id==='blimea')label('FALSO SUELO PRACTICABLE',1.1,0,0.06,D/2-1.2,0,0,'#4a5058');
  }

  /* ---- renewed rack ---- */
  const renewLabel = n.id==='pao' ? 'ENRUTADOR NUEVO (PF-2)' : 'OLT GPON/XGSPON';
  const rx = R.type==='pao' ? -W/2+2.0 : (isBig?0:-W/2+.45);
  const rz = R.type==='pao' ? -D/2+2.6 : (isBig?-D/2+1.6:-0.35);
  const renewRack=oltRack(rx,rz,isBig||R.type==='pao'?0:Math.PI/2,renewLabel,'Nueva',48,true);
  const halo=new THREE.PointLight(0x41e3d2,0,4);halo.position.set(rx,1.6,rz);scene.add(halo);
  renewRack.visible=false;

  /* ---- legend ---- */
  const roles=(n.interior||[]).filter(x=>x[2]!=='planta').map(x=>x[2]);
  const rolTxt={izq:'pared izquierda',dcha:'pared derecha',fondo:'pared del fondo'};
  document.getElementById('svLegend')!.innerHTML=
    `<b style="color:var(--txt)">Elementos recreados (datos del pliego)</b><br>`+
    `\u00b7 Envolvente: ${R.desc}<br>`+
    (n.id==='pao'
      ? `\u00b7 7750SR-7 al 100% \u00b7 GENBAND V5.2 \u00b7 3 CWDM \u00b7 2 maquetas OLT<br>\u00b7 10 jaulas de operadores en malla verde y aluminio (foto real; el pliego cita tabiques de aluminio y cristal): Telef\u00f3nica, Vodafone, Orange, Telecable, Adamo, Digi, Conecta-T, Sestaferia, Operiax y Cogent<br>\u00b7 Racks gris claro perforado, GENBAND con tarjetas de pesta\u00f1a naranja, ODF con franja roja y mangueras de fibra: seg\u00fan la fotograf\u00eda del PAO<br>`
      : `\u00b7 ${n.olts.length} bastidor(es) OLT ${vendor0} \u00b7 ${nODF} repartidor(es) F.O.<br>\u00b7 Energ\u00eda CC + bater\u00edas \u00b7 CATV \u00b7 Transporte \u00b7 C.GEN, alarmas, clima<br>`)+
    (n.id==='cangas'?'\u00b7 Chafl\u00e1n de esquina y viga del pliego recreados<br>':'')+
    (n.id==='blimea'?'\u00b7 Falso suelo practicable recreado (baldosas 60\u00d760)<br>':'')+
    `<span style="color:#5a6f8d">Interpretaci\u00f3n de alzados: ${[...new Set(roles)].map(r=>rolTxt[r]||r).join(' \u00b7 ')} \u2192 distribuci\u00f3n de bastidores y energ\u00eda.</span>`;

  const modeBtn=document.getElementById('svMode')!;
  let renewed=false;
  modeBtn.textContent='\u21c4 Ver renovado';
  modeBtn.onclick=()=>{
    renewed=!renewed;
    oldRacks.forEach(r=>r.visible=!renewed);
    renewRack.visible=renewed;
    halo.intensity=renewed?1.1:0;
    modeBtn.textContent=renewed?'\u21c4 Ver actual':'\u21c4 Ver renovado';
  };

  let yaw=0, pitch=0;
  const keys={};
  const kd=e=>{keys[e.key.toLowerCase()]=true;};
  const ku=e=>{keys[e.key.toLowerCase()]=false;};
  addEventListener('keydown',kd);addEventListener('keyup',ku);
  let drag=null;
  const pd=e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)};
  const pm=e=>{if(!drag)return;yaw-=(e.clientX-drag[0])*.004;pitch=Math.max(-1.2,Math.min(1.2,pitch-(e.clientY-drag[1])*.004));drag=[e.clientX,e.clientY];};
  const pu=()=>drag=null;
  canvas.addEventListener('pointerdown',pd);canvas.addEventListener('pointermove',pm);
  canvas.addEventListener('pointerup',pu);canvas.addEventListener('pointercancel',pu);
  const pad={f:0,b:0,l:0,r:0};
  document.querySelectorAll('#svPad button').forEach(b=>{
    const k=b.dataset.k;
    const on=e=>{e.preventDefault();pad[k]=1};
    const off=e=>{e.preventDefault();pad[k]=0};
    b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off);
  });
  function resize(){
    const w=holder.clientWidth,h=holder.clientHeight;
    renderer.setSize(w,h,false);renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    cam.aspect=w/h;cam.updateProjectionMatrix();
  }
  addEventListener('resize',resize);resize();
  document.getElementById('svLoading')!.style.display='none';

  let raf,last=performance.now();
  function frame(t){
    raf=requestAnimationFrame(frame);
    const dt=Math.min((t-last)/1000,.05);last=t;
    const sp=2.2*dt;
    let mx=0,mz=0;
    if(keys['w']||keys['arrowup']||pad.f)mz-=1;
    if(keys['s']||keys['arrowdown']||pad.b)mz+=1;
    if(keys['a']||keys['arrowleft']||pad.l)mx-=1;
    if(keys['d']||keys['arrowright']||pad.r)mx+=1;
    if(mx||mz){
      const f=-mz,r=mx;
      cam.position.x+=(-Math.sin(yaw)*f+Math.cos(yaw)*r)*sp;
      cam.position.z+=(-Math.cos(yaw)*f-Math.sin(yaw)*r)*sp;
      cam.position.x=Math.max(-W/2+.35,Math.min(W/2-.35,cam.position.x));
      cam.position.z=Math.max(-D/2+.35,Math.min(D/2-.35,cam.position.z));
    }
    cam.rotation.order='YXZ';cam.rotation.y=yaw;cam.rotation.x=pitch;
    const tt=t/1000;
    for(let i=0;i<leds.length;i++){
      const L=leds[i];
      const on=Math.sin(tt*3+L.ph)>-0.55;
      L.m.material.color.setHex(on?L.base:0x0d1218);
    }
    renderer.render(scene,cam);
  }
  raf=requestAnimationFrame(frame);
  SV={stop(){cancelAnimationFrame(raf);removeEventListener('keydown',kd);removeEventListener('keyup',ku);removeEventListener('resize',resize);renderer.dispose();}};
}
