import * as T from './vendor/norse-engine.mjs';

// A self-contained, original miniature: Yggdrasil, the well and nine realm stones.
// The renderer is loaded only near the footer; no network textures or models.
export function createSanctuary(host, options = {}) {
  const canvas = host.querySelector('[data-ash-canvas]');
  if (!canvas) throw new Error('The sanctuary needs a canvas.');
  const renderer = new T.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'low-power'});
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x102127, .014);
  const world = new T.Group();
  scene.add(world);
  const camera = new T.PerspectiveCamera(39, 1, .1, 110);
  const target = new T.Vector3(0, 1.65, 0);
  const orbit = {azimuth:.72, polar:1.02, zoom:1};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motion = options.motion || window.GardenMotion;
  let active = false, disposed = false, contextLost = false, time = 0, last = 0;
  let fallbackFrame = 0, fallbackTimer = 0, width = 1, height = 1, frameCount = 0;
  let awake = false, drag = false;
  const pickers = [], runes = [], glowSprites = [], ripples = [], resources = new Set();
  const materials = new Map();
  let seed = 9743;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const range = (a, b) => a + random() * (b - a);
  const economy = () => !!motion?.isEconomy();
  const canAnimate = () => !disposed && !contextLost && active && !document.hidden && !reduced.matches &&
    !document.documentElement.classList.contains('garden-lite-motion') && (!motion || motion.canAnimate());
  const own = resource => { resources.add(resource); return resource; };
  const ramp = own(new T.DataTexture(new Uint8Array([72, 124, 184, 242]), 4, 1, T.RedFormat));
  ramp.minFilter = ramp.magFilter = T.NearestFilter;
  ramp.needsUpdate = true;
  function paint(color, emissive = 0x000000) {
    const key = String(color) + ':' + emissive;
    if (!materials.has(key)) materials.set(key, own(new T.MeshToonMaterial({color, gradientMap:ramp, emissive, emissiveIntensity:.2})));
    return materials.get(key);
  }
  function ink(color, opacity = 1) {
    return own(new T.MeshBasicMaterial({color, transparent:opacity < 1, opacity, depthWrite:opacity === 1, toneMapped:false}));
  }
  const palette = {
    rock:paint(0x536568), slate:paint(0x263a40), pale:paint(0x82928c), earth:paint(0x273b38),
    moss:paint(0x385a48), wood:paint(0x657369), darkWood:paint(0x37433b), bronze:paint(0x97704c),
    leafA:paint(0x40695c), leafB:paint(0x5b8b72), leafC:paint(0x7b9e80), roof:paint(0x29434d),
    gold:ink(0xffc281), frost:ink(0x82bfbc), coal:paint(0x10242b)
  };
  function mesh(geometry, material, x=0, y=0, z=0, parent=world, shadow=true) {
    own(geometry);
    const item = new T.Mesh(geometry, material);
    item.position.set(x,y,z); item.castShadow = shadow; item.receiveShadow = true;
    item.userData.static = true; parent.add(item); return item;
  }
  function box(w,h,d,material,x,y,z,parent=world) { return mesh(new T.BoxGeometry(w,h,d),material,x,y,z,parent); }
  function cylinder(rt,rb,h,material,x,y,z,sides=8,parent=world) { return mesh(new T.CylinderGeometry(rt,rb,h,sides),material,x,y,z,parent); }
  function outline(item, color=0x12262b, opacity=.55) {
    const edge = new T.LineSegments(own(new T.EdgesGeometry(item.geometry,24)), own(new T.LineBasicMaterial({color,transparent:true,opacity})));
    item.add(edge); return edge;
  }
  function tapered(points, from, to, segments=16) {
    const curve = new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    const geometry = new T.TubeGeometry(curve,segments,1,7,false);
    const position = geometry.attributes.position;
    for(let i=0;i<=segments;i++) {
      const center = curve.getPointAt(i/segments);
      const radius = from + (to-from) * Math.pow(i/segments,.78);
      for(let j=0;j<=7;j++) {
        const n=i*8+j;
        const p=new T.Vector3().fromBufferAttribute(position,n).sub(center).multiplyScalar(radius).add(center);
        position.setXYZ(n,p.x,p.y,p.z);
      }
    }
    const faceted=geometry.toNonIndexed(); geometry.dispose(); faceted.computeVertexNormals(); return faceted;
  }
  function tube(points,radius,material,parent=world) {
    return mesh(tapered(points,radius,radius,16),material,0,0,0,parent);
  }
  function glow(color, size, x,y,z, opacity=.35, parent=world) {
    const texCanvas=document.createElement('canvas'); texCanvas.width=texCanvas.height=64;
    const ctx=texCanvas.getContext('2d');
    const gradient=ctx.createRadialGradient(32,32,0,32,32,32);
    gradient.addColorStop(0,'rgba(255,255,255,.9)'); gradient.addColorStop(.16,'rgba(255,255,255,.4)');
    gradient.addColorStop(.44,'rgba(255,255,255,.09)'); gradient.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=gradient; ctx.fillRect(0,0,64,64);
    const sprite=new T.Sprite(own(new T.SpriteMaterial({map:own(new T.CanvasTexture(texCanvas)),color,
      transparent:true,opacity,blending:T.AdditiveBlending,depthWrite:false})));
    sprite.scale.set(size,size,1); sprite.position.set(x,y,z); parent.add(sprite);
    glowSprites.push({sprite,opacity,phase:range(0,6)}); return sprite;
  }

  // Light is part of the miniature's composition: cold moon, warm tree heart.
  scene.add(new T.HemisphereLight(0xbcd5df,0x253b39,.85));
  const moon = new T.DirectionalLight(0xb9d9e6,1.75);
  moon.position.set(-5,13,6); moon.castShadow=true;
  moon.shadow.mapSize.set(1024,1024); moon.shadow.camera.left=moon.shadow.camera.bottom=-9;
  moon.shadow.camera.right=moon.shadow.camera.top=9; moon.shadow.camera.far=35;
  moon.shadow.normalBias=.045; moon.shadow.bias=-.0004; scene.add(moon);
  const heartLight=new T.PointLight(0xffb96c,16,12,2); heartLight.position.set(0,2.55,.5); scene.add(heartLight);
  const wellLight=new T.PointLight(0x7ee0d4,8,9,2); wellLight.position.set(-1,.9,2.5); scene.add(wellLight);
  const rim=new T.DirectionalLight(0x8faea4,.72); rim.position.set(5,7,-8); scene.add(rim);

  // A complete square plinth. The cutaway strata make it feel collectible.
  const plinth=box(12,1.15,12,palette.coal,0,-.72,0); outline(plinth);
  box(11.9,.13,11.9,palette.bronze,0,-1.22,0);
  box(12.06,.18,12.06,palette.slate,0,-.18,0);
  box(11.8,.27,11.8,palette.earth,0,.03,0);
  for(let side=0;side<4;side++) for(let i=0;i<12;i++) {
    const block=box(.91,.24,.32,i%3===0?palette.pale:palette.rock,0,.23,0);
    const offset=-5.5+i;
    block.position.x=side<2?offset:(side===2?-5.84:5.84);
    block.position.z=side<2?(side===0?-5.84:5.84):offset;
    block.rotation.y=side>=2?Math.PI/2:0;
  }
  for(let side=0;side<2;side++) for(let i=0;i<9;i++) {
    const cut=box(.48,.014,.015,palette.bronze,-5+i*1.2,-.68,side===0?6.009:-6.009);
    cut.rotation.z=(i%2?.18:-.18);
  }
  // Moss islands and hand-laid paving, leaving the front well open.
  cylinder(2.42,2.6,.3,palette.slate,0,.3,-.9,16);
  cylinder(2.13,2.35,.16,palette.rock,0,.51,-.9,16);
  cylinder(1.94,2.02,.08,palette.earth,0,.64,-.9,16);
  const rimRing=mesh(new T.TorusGeometry(2.17,.028,5,64),palette.bronze,0,.605,-.9);
  rimRing.rotation.x=-Math.PI/2;
  for(let i=0;i<18;i++) {
    const a=i*Math.PI/9;
    const p=box(.52,.07,.33,i%4?palette.rock:palette.pale,Math.sin(a)*2.6,.31,Math.cos(a)*2.6-.9);
    p.rotation.y=a+range(-.08,.08);
  }
  for(let i=0;i<8;i++) {
    const step=box(1.24,.12,.49,i%3?palette.rock:palette.pale,1.75+Math.sin(i*.43)*.17,.36+i*.016,5.45-i*.58);
    step.rotation.y=range(-.08,.08); outline(step,0x1c3035,.3);
  }

  // Yggdrasil: a tapered, twisted trunk, irregular boughs, exposed roots and a
  // faceted canopy. All bark geometry is merged into a single shaded mesh.
  const bark=[];
  bark.push(tapered([[0,.6,-.9],[-.46,1.5,-.72],[-.28,2.5,-.86],[.25,3.5,-1.05],[.12,4.6,-1],[.3,5.8,-1.15]],.63,.19,28));
  const crowns=[];
  for(let i=0;i<7;i++) {
    const a=i*Math.PI*2/7+.2;
    const reach=i%2===0?2.95:2.35;
    const startY=2.45+(i%3)*.6;
    const ex=Math.cos(a)*reach, ez=Math.sin(a)*reach-.9, ey=5.55+(i%3)*.44;
    bark.push(tapered([[-.08,startY,-.9],[Math.cos(a)*.65,startY+.45,Math.sin(a)*.6-.9],
      [ex*.66,ey-.92,(ez+.9)*.62-.9],[ex,ey,ez]],.26,.045,18));
    for(let j=0;j<2;j++) {
      const ax=a+(j?-.37:.42), tx=ex+Math.cos(ax)*.68, tz=ez+Math.sin(ax)*.68;
      bark.push(tapered([[ex*.63,ey-.92,(ez+.9)*.63-.9],[ex*.8,ey-.2,ez],[tx,ey+.45,tz]],.08,.018,10));
    }
    crowns.push([ex,ey+.34,ez]);
  }
  for(let i=0;i<10;i++) {
    const a=i*Math.PI/5+.15, r=range(2.5,3.7);
    const root=[[0,.94,-.9],[Math.cos(a-.3)*.85,.98,Math.sin(a-.3)*.85-.9],
      [Math.cos(a+.2)*1.7,.73,Math.sin(a+.2)*1.7-.9],
      [Math.cos(a-.12)*r*.83,.39,Math.sin(a-.12)*r*.83-.9],
      [Math.cos(a)*r,.28,Math.sin(a)*r-.9]];
    bark.push(tapered(root,.29,.025,18));
    if(i%2===0) tube(root.map(([x,y,z])=>[x,y+.1,z]),.013,palette.gold);
    const fork=root[2];
    bark.push(tapered([fork,[Math.cos(a+.42)*r*.78,.39,Math.sin(a+.42)*r*.78-.9],
      [Math.cos(a+.55)*r,.26,Math.sin(a+.55)*r-.9]],.105,.016,12));
  }
  const tree=mesh(T.mergeGeometries(bark),palette.wood); bark.forEach(g=>g.dispose());
  tree.userData.interact='tree'; tree.userData.static=false; pickers.push(tree);
  // Engraved seams of amber sap follow the trunk, without replacing its texture.
  const sap=tube([[.23,.82,-.35],[.08,1.7,-.17],[.11,2.4,-.42],[.43,3.15,-.53],[.44,4.13,-.61]],.022,palette.gold);
  sap.castShadow=false;
  const heart=mesh(new T.IcosahedronGeometry(.19,0),palette.gold,.04,2.61,-.2);
  heart.scale.set(.8,1.6,.8); heart.userData.interact='tree'; heart.userData.static=false; pickers.push(heart);
  glow(0xffc47e,2.1,.04,2.62,-.13,.66);
  glow(0x66c9a8,9,0,5.1,-1.5,.075);
  for(let i=0;i<crowns.length;i++) {
    const [x,y,z]=crowns[i];
    const foliage=mesh(new T.IcosahedronGeometry(1,1),[palette.leafA,palette.leafB,palette.leafC][i%3],x,y,z);
    foliage.scale.set(1.2+(i%2)*.12,.64+(i%3)*.08,1.08);
    for(let j=0;j<7;j++) {
      const a=j*.9+i;
      const cluster=mesh(new T.IcosahedronGeometry(1,1),[palette.leafA,palette.leafB,palette.leafC][(i+j)%3],
        x+Math.cos(a)*.88,y+range(-.34,.32),z+Math.sin(a)*.76);
      cluster.scale.set(range(.47,.72),range(.31,.47),range(.48,.69));
    }
  }
  const crown=mesh(new T.IcosahedronGeometry(1,1),palette.leafB,.2,6.8,-.9); crown.scale.set(1.66,.96,1.5);
  // Smaller edge clusters break the large canopy into leaf-sized facets.
  const leafGeometry=own(new T.IcosahedronGeometry(1,0));
  const leafDetail=new T.InstancedMesh(leafGeometry,palette.leafB,100);
  const leafDummy=new T.Object3D();
  for(let i=0;i<100;i++) {
    const [x,y,z]=crowns[i%crowns.length], a=range(0,Math.PI*2), r=range(.75,1.4);
    leafDummy.position.set(x+Math.cos(a)*r,y+range(-.52,.53),z+Math.sin(a)*r*.84);
    leafDummy.scale.set(range(.1,.22),range(.09,.16),range(.1,.21));
    leafDummy.rotation.set(range(0,2),range(0,6),range(0,2));leafDummy.updateMatrix();leafDetail.setMatrixAt(i,leafDummy.matrix);
  }
  world.add(leafDetail);
  // A curved northern-light ribbon lives in the miniature's back half. Its
  // gentle shader drift stays on the same shared, visibility-aware clock.
  const auroraPositions=[],auroraUvs=[],auroraIndices=[];
  for(let i=0;i<=48;i++) {
    const t=i/48,a=Math.PI+t*Math.PI;
    const x=Math.cos(a)*4.4,z=Math.sin(a)*2.25-1.05,y=7.05+Math.sin(t*Math.PI)*.65;
    auroraPositions.push(x,y-.45,z,x,y+.45,z);auroraUvs.push(t,0,t,1);
    if(i<48) {const k=i*2;auroraIndices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const auroraGeometry=own(new T.BufferGeometry());
  auroraGeometry.setAttribute('position',new T.Float32BufferAttribute(auroraPositions,3));
  auroraGeometry.setAttribute('uv',new T.Float32BufferAttribute(auroraUvs,2));auroraGeometry.setIndex(auroraIndices);
  const auroraMaterial=own(new T.ShaderMaterial({uniforms:{uTime:{value:0}},transparent:true,depthWrite:false,
    side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 vUv; uniform float uTime;
      void main(){float veil=pow(sin(vUv.x*3.14159),.8)*pow(sin(vUv.y*3.14159),1.6);
      float ray=.7+.3*sin(vUv.x*94.0+sin(vUv.x*12.0+uTime*.16)*2.0);
      vec3 ink=mix(vec3(.2,.63,.49),vec3(.49,.61,.36),vUv.y);
      gl_FragColor=vec4(ink,veil*ray*.38);}`
  }));
  const aurora=new T.Mesh(auroraGeometry,auroraMaterial);world.add(aurora);
  const mist=[];
  for(const [x,y,z] of [[-2.2,.54,1.1],[2,.48,2.7],[.3,.54,-3.2]]) {
    const puff=glow(0x7da69a,4,x,y,z,.045);
    puff.material.blending=T.NormalBlending; puff.scale.set(4,.7,1);
    mist.push({puff,x,phase:range(0,6)});
  }
  // A few gilded leaves and hanging offerings add scale, rather than visual noise.
  for(let i=0;i<10;i++) {
    const a=i*2.4;
    const leaf=mesh(new T.IcosahedronGeometry(.1,0),i%3===0?palette.bronze:palette.leafC,
      Math.cos(a)*range(1.6,3),range(5.4,6.4),Math.sin(a)*2-.9);
    leaf.scale.set(.6,1.1,.3); leaf.rotation.z=a;
  }
  for(const [x,z,h] of [[-2,-1.1,4.5],[1.3,-2.2,4.8],[2.2,-.2,4.45]]) {
    tube([[x,h+.65,z],[x,h,z]],.008,palette.bronze);
    const charm=mesh(new T.TorusGeometry(.095,.018,4,12),palette.bronze,x,h-.06,z);
    charm.rotation.y=.3;
  }

  // Nine carved ward stones. Symbols are stylized Elder Futhark-inspired marks,
  // decorative rather than claims about a historical map of the nine worlds.
  const glyphs=[[[0,-.8],[0,.8],[-.45,.3],[0,0],[.45,.3]], [[-.4,-.8],[-.4,.8],[.4,.8],[.4,-.8]],
    [[0,-.8],[0,.8],[-.4,.3],[0,.65],[.4,.3]], [[0,-.8],[0,.8],[.45,.2],[0,-.2]],
    [[0,-.8],[0,.8],[-.42,0],[0,-.42],[.42,0],[0,.42],[-.42,0]],
    [[-.45,.5],[0,0],[.45,.5],[0,0],[0,-.8]], [[-.4,-.8],[.4,.8],[0,0],[.4,-.8],[-.4,.8]],
    [[0,-.8],[0,.8],[-.45,.45],[0,.05],[.45,.45]], [[0,-.8],[0,.8],[-.4,-.2],[0,.2],[.4,-.2]]];
  for(let i=0;i<9;i++) {
    const a=i*Math.PI*2/9+.12, r=4.45;
    const group=new T.Group(); group.position.set(Math.sin(a)*r,.29,Math.cos(a)*r-.3); group.rotation.y=a;
    world.add(group);
    const h=1.13+(i%3)*.2;
    cylinder(.49,.6,.13,palette.slate,0,.07,0,7,group);
    const stone=mesh(new T.IcosahedronGeometry(1,0),i%2?palette.rock:palette.pale,0,h*.55,0,group);
    stone.scale.set(.4,h*.57,.33); stone.userData.interact='tree'; stone.userData.static=false; pickers.push(stone);
    const tex=document.createElement('canvas'); tex.width=128; tex.height=256;
    const ctx=tex.getContext('2d'); ctx.strokeStyle='#b6e3cb'; ctx.lineWidth=7; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath(); glyphs[i].forEach(([x,y],n)=>n?ctx.lineTo(64+x*70,128-y*80):ctx.moveTo(64+x*70,128-y*80)); ctx.stroke();
    const material=own(new T.MeshBasicMaterial({map:own(new T.CanvasTexture(tex)),transparent:true,opacity:.72,depthWrite:false}));
    const rune=mesh(new T.PlaneGeometry(.34,.69),material,0,h*.56,.325,group,false); rune.userData.static=false;
    const halo=glow(i%3===0?0xffc184:0x8edcd2,1.25,0,h*.59,.4,.21,group);
    runes.push({rune,halo,phase:i*.69});
    cylinder(.55,.58,.035,palette.moss,0,.145,0,8,group);
    if(i%2===0) box(.19,.12,.3,palette.bronze,.49,.15,.08,group);
  }

  // The well is a real planar reflection with subtle refractive disturbance.
  const lakeShape=new T.Shape();
  lakeShape.moveTo(-4.4,-1.85); lakeShape.lineTo(-4.3,.15); lakeShape.lineTo(-3.1,1.4);
  lakeShape.lineTo(-1.1,1.68); lakeShape.lineTo(.8,1.16); lakeShape.lineTo(3.9,.9);
  lakeShape.lineTo(4.15,-1.7); lakeShape.lineTo(2.8,-2.05); lakeShape.lineTo(-2,-2.15); lakeShape.closePath();
  const reflectionShader={...T.Reflector.ReflectorShader,
    uniforms:{...T.Reflector.ReflectorShader.uniforms, uTime:{value:0}},
    vertexShader:T.Reflector.ReflectorShader.vertexShader.replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 vSurface;').replace('vUv = textureMatrix', 'vSurface = position.xy; vUv = textureMatrix'),
    fragmentShader:T.Reflector.ReflectorShader.fragmentShader.replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 vSurface; uniform float uTime;').replace('vec4 base = texture2DProj( tDiffuse, vUv );', `vec4 waveUv=vUv;
      waveUv.x += sin(vSurface.x*11.0+uTime*1.7)*.0017*vUv.w;
      waveUv.y += cos(vSurface.y*13.0-uTime*1.2)*.0014*vUv.w;
      vec4 base = texture2DProj(tDiffuse,waveUv);`).replace('vec4( blendOverlay( base.rgb, color ), 1.0 )',
      'vec4(mix(color * 0.2, base.rgb, 0.57), 1.0)')};
  const water=new T.Reflector(own(new T.ShapeGeometry(lakeShape)),{textureWidth:512,textureHeight:512,multisample:0,
    color:0x538182,clipBias:.004,shader:reflectionShader});
  water.rotation.x=-Math.PI/2; water.position.set(-.25,.245,3.35); world.add(water);
  const reflect=water.onBeforeRender.bind(water);
  let reflectionDirty=true;
  water.onBeforeRender=(r,s,c)=>{ if(reflectionDirty || !economy() || frameCount%3===0) {reflect(r,s,c);reflectionDirty=false;} };
  for(let i=0;i<14;i++) {
    const ripple=mesh(new T.RingGeometry(.85,1,36),own(new T.MeshBasicMaterial({color:0x9acbd0,
      transparent:true,opacity:.25,side:T.DoubleSide,depthWrite:false})),range(-3.6,3.4),.257,range(2.15,5.2),world,false);
    ripple.rotation.x=-Math.PI/2; ripple.userData.static=false;
    ripples.push({mesh:ripple,phase:range(0,1),speed:range(.22,.42)});
  }
  // The golden thread of Bifrost is deliberately restrained to the site's moss/rust palette.
  for(let i=0;i<5;i++) {
    const stone=box(.92,.1,.42,palette.pale,-2.95+i*.12,.37,5.07-i*.5); stone.rotation.y=.16;
    const seam=box(.77,.012,.024,i%2?palette.frost:palette.gold,-2.95+i*.12,.43,5.07-i*.5);
    seam.rotation.y=.16;
  }
  for(const x of [-3.5,-2.25]) {
    for(let i=0;i<4;i++) cylinder(.026,.036,.44,palette.bronze,x+i*.12,.59,4.8-i*.52,6);
    tube([[x,.81,4.95],[x+.2,.85,3.95],[x+.39,.8,3.3]],.025,palette.bronze);
  }

  // Small northern ruins: an open arch, a torchlit timber shrine and broken columns.
  const gate=new T.Group(); gate.position.set(-3.9,.23,-3.4); gate.rotation.y=.25; world.add(gate);
  for(const x of [-.7,.7]) {
    box(.42,1.85,.48,palette.rock,x,.96,0,gate);
    box(.62,.17,.61,palette.pale,x,1.86,0,gate);
    for(let y=.45;y<1.8;y+=.36) box(.44,.025,.5,palette.slate,x,y,0,gate);
  }
  const lintel=box(2,.42,.63,palette.pale,0,2.1,0,gate); lintel.rotation.z=-.035;
  box(.52,.15,.69,palette.moss,-.58,2.4,.03,gate);
  for(let i=0;i<3;i++) box(.32,.09,.62,palette.rock,-.55+i*.55,.03,.64,gate);
  const hall=new T.Group(); hall.position.set(3.62,.2,-3.76); hall.rotation.y=-.24; world.add(hall);
  box(1.76,1.22,1.87,palette.darkWood,0,.75,0,hall);
  box(2,.24,2.1,palette.slate,0,.08,0,hall);
  for(let i=0;i<6;i++) box(1.8,.026,1.9,palette.wood,0,.29+i*.19,0,hall);
  const roofShape=new T.Shape(); roofShape.moveTo(-1.11,0); roofShape.lineTo(0,.84); roofShape.lineTo(1.11,0); roofShape.closePath();
  mesh(new T.ExtrudeGeometry(roofShape,{depth:2.35,bevelEnabled:false}),palette.roof,0,1.4,-1.17,hall);
  tube([[-1.16,1.39,1.22],[0,2.3,1.22],[1.16,1.39,1.22]],.055,palette.bronze,hall);
  tube([[0,2.26,-1.24],[0,2.32,0],[0,2.26,1.24]],.048,palette.darkWood,hall);
  for(const x of [-.53,.53]) {
    box(.39,.49,.025,palette.gold,x,.89,.952,hall);
    for(const dx of [-.21,.21]) box(.035,.57,.035,palette.bronze,x+dx,.89,.975,hall);
    box(.39,.033,.036,palette.bronze,x,.89,.985,hall);
  }
  box(.34,.64,.055,palette.wood,0,.58,.974,hall);
  box(.048,.04,.02,palette.gold,.1,.64,1.01,hall);
  glow(0xffc68a,2.5,0,1,1.01,.32,hall);
  const shrineLight=new T.PointLight(0xffbe81,5,5,2); shrineLight.position.set(3.55,1.1,-2.54); scene.add(shrineLight);
  for(let i=0;i<3;i++) {
    const x=-4.75+i*.68,z=-.6+i*.7;
    cylinder(.22,.3,.55+(i%2)*.35,palette.rock,x,.51,z,7);
    cylinder(.31,.32,.1,palette.pale,x,.82+(i%2)*.17,z,7);
  }
  for(const [x,z] of [[-3.45,-2.5],[3.25,.4]]) {
    cylinder(.035,.055,.82,palette.darkWood,x,.69,z,6);
    box(.26,.29,.26,palette.bronze,x,1.17,z);
    box(.17,.22,.17,palette.gold,x,1.18,z);
    const roof=mesh(new T.ConeGeometry(.23,.18,4),palette.slate,x,1.42,z); roof.rotation.y=Math.PI/4;
    glow(0xffb870,1.8,x,1.19,z,.48);
  }
  // Huginn and Muninn watch from a bough and the arch, with folded wings.
  for(const [x,y,z,a] of [[-1.83,4.3,.18,.4],[-3.18,2.64,-3.5,-.6]]) {
    const raven=new T.Group(); raven.position.set(x,y,z); raven.rotation.y=a; world.add(raven);
    const body=mesh(new T.IcosahedronGeometry(.16,0),palette.coal,0,0,0,raven); body.scale.set(.75,1.4,1.1);
    mesh(new T.IcosahedronGeometry(.1,0),palette.coal,0,.19,.07,raven);
    const beak=mesh(new T.ConeGeometry(.035,.16,4),palette.bronze,0,.19,.2,raven); beak.rotation.x=Math.PI/2;
    const tail=mesh(new T.ConeGeometry(.085,.31,3),palette.coal,0,-.14,-.12,raven); tail.rotation.x=-.5;
    for(const x of [-.05,.05]) cylinder(.012,.012,.14,palette.coal,x,-.22,.02,4,raven);
  }

  // Scattered basalt and clover-sized ground cover are instanced, not hundreds
  // of individual draw calls. No particle can leave the square footprint.
  const rockGeometry=own(new T.IcosahedronGeometry(1,0));
  const rocks=new T.InstancedMesh(rockGeometry,palette.rock,54); rocks.castShadow=true; rocks.receiveShadow=true;
  const dummy=new T.Object3D();
  for(let i=0;i<54;i++) {
    let x=range(-5.4,5.4),z=range(-5.4,5.4);
    if(z>1.9&&Math.abs(x)<4) z=range(-5.2,-2.8);
    dummy.position.set(x,.31,z); dummy.rotation.set(range(0,2),range(0,6),range(0,2));
    const s=range(.07,.23); dummy.scale.set(s*1.5,s*.82,s); dummy.updateMatrix(); rocks.setMatrixAt(i,dummy.matrix);
  }
  world.add(rocks);
  const grassGeometry=own(new T.ConeGeometry(.045,.28,3));
  const grass=new T.InstancedMesh(grassGeometry,palette.moss,170);
  for(let i=0;i<170;i++) {
    let x=range(-5.5,5.5),z=range(-5.5,5.5);
    if(z>1.5&&Math.abs(x)<4.2) z=range(-5.5,-2);
    dummy.position.set(x,.34,z); dummy.rotation.set(range(-.25,.25),range(0,6),range(-.25,.25));
    dummy.scale.set(1,range(.55,1.4),1); dummy.updateMatrix(); grass.setMatrixAt(i,dummy.matrix);
  }
  world.add(grass);
  for(let i=0;i<8;i++) {
    const x=range(-3,3),z=range(-4.2,-2.4);
    cylinder(.018,.025,.1,palette.pale,x,.31,z,5);
    const cap=mesh(new T.SphereGeometry(.1,6,4,0,Math.PI*2,0,Math.PI/2),palette.bronze,x,.38,z); cap.scale.y=.6;
  }
  // Soft contact shadow under the collectible, independent of the page theme.
  const shadowTexture=document.createElement('canvas'); shadowTexture.width=shadowTexture.height=128;
  const sc=shadowTexture.getContext('2d'); const sg=sc.createRadialGradient(64,64,14,64,64,62);
  sg.addColorStop(0,'rgba(0,0,0,.78)'); sg.addColorStop(.55,'rgba(0,0,0,.36)'); sg.addColorStop(1,'rgba(0,0,0,0)');
  sc.fillStyle=sg; sc.fillRect(0,0,128,128);
  const contact=mesh(new T.PlaneGeometry(19,19),own(new T.MeshBasicMaterial({map:own(new T.CanvasTexture(shadowTexture)),
    transparent:true,depthWrite:false})),0,-1.335,0,scene,false); contact.rotation.x=-Math.PI/2;

  const rainCount=220, rainPositions=new Float32Array(rainCount*6), rainData=[];
  for(let i=0;i<rainCount;i++) rainData.push({x:range(-5.8,5.8),z:range(-5.8,5.8),y:range(.3,9),speed:range(5,8.5)});
  const rainGeometry=own(new T.BufferGeometry()); rainGeometry.setAttribute('position',new T.Float32BufferAttribute(rainPositions,3));
  const rain=new T.LineSegments(rainGeometry,own(new T.LineBasicMaterial({color:0xa7c2cb,transparent:true,opacity:.24,depthWrite:false})));
  world.add(rain);
  const fireflyCount=24, fireflies=[];
  const sparks=new T.InstancedMesh(own(new T.SphereGeometry(.027,4,3)),palette.gold,fireflyCount);
  for(let i=0;i<fireflyCount;i++) fireflies.push({x:range(-3.2,3.2),y:range(1,5.5),z:range(-3.2,3),phase:range(0,7)});
  world.add(sparks);

  // Bake the static props by material; shadows and the water pass reuse them.
  world.updateMatrixWorld(true);
  const buckets=new Map();
  world.traverse(item=>{
    if(!item.isMesh||item.isInstancedMesh||!item.userData.static||item.children.length||Array.isArray(item.material)) return;
    const key=item.material.uuid+':'+item.castShadow;
    if(!buckets.has(key)) buckets.set(key,[]); buckets.get(key).push(item);
  });
  buckets.forEach(items=>{
    if(items.length<2) return;
    const geometries=items.map(item=>{const g=item.geometry.index?item.geometry.toNonIndexed():item.geometry.clone(); return g.applyMatrix4(item.matrixWorld);});
    const merged=T.mergeGeometries(geometries);
    geometries.forEach(g=>g.dispose());
    if(!merged) return;
    const baked=mesh(merged,items[0].material); baked.castShadow=items[0].castShadow;
    items.forEach(item=>item.removeFromParent());
  });

  function updateCamera() {
    const fit=Math.max(1,1.12/camera.aspect);
    const distance=25*fit*orbit.zoom;
    camera.position.set(target.x+Math.sin(orbit.azimuth)*Math.sin(orbit.polar)*distance,
      target.y+Math.cos(orbit.polar)*distance,target.z+Math.cos(orbit.azimuth)*Math.sin(orbit.polar)*distance);
    camera.lookAt(target);
    host.dataset.orbit=orbit.azimuth.toFixed(3);
    host.dataset.zoom=orbit.zoom.toFixed(3);
  }
  function draw(immediate=true) {
    if(disposed||contextLost||!active||document.hidden) return;
    updateCamera(); frameCount++;
    if(immediate) reflectionDirty=true;
    renderer.render(scene,camera);
    host.dataset.frame=String(frameCount);
    host.dataset.triangles=String(renderer.info.render.triangles);
  }
  function render(now,elapsed=33) {
    if(!canAnimate()) return;
    time+=Math.min(elapsed,80)/1000;
    water.material.uniforms.uTime.value=time;
    auroraMaterial.uniforms.uTime.value=time;
    mist.forEach(({puff,x,phase})=>{puff.position.x=x+Math.sin(time*.11+phase)*.23;});
    rain.visible=true; sparks.visible=true;
    const count=economy()?80:rainCount;
    rainGeometry.setDrawRange(0,count*2);
    for(let i=0;i<count;i++) {
      const d=rainData[i]; d.y-=d.speed*Math.min(elapsed,80)/1000;
      if(d.y<.28) d.y=9;
      const offset=i*6;
      rainPositions[offset]=d.x; rainPositions[offset+1]=d.y; rainPositions[offset+2]=d.z;
      rainPositions[offset+3]=d.x-.045; rainPositions[offset+4]=d.y+.2; rainPositions[offset+5]=d.z;
    }
    rainGeometry.attributes.position.needsUpdate=true;
    ripples.forEach(({mesh,phase,speed})=>{
      const life=(time*speed+phase)%1; mesh.scale.setScalar(.06+life*.48);
      mesh.material.opacity=Math.sin(life*Math.PI)*.2;
    });
    glowSprites.forEach(({sprite,opacity,phase})=>{sprite.material.opacity=opacity*(.92+Math.sin(time*1.3+phase)*.08);});
    runes.forEach(({rune,halo,phase})=>{
      rune.material.opacity=awake?.94:.54;
      halo.material.opacity=(awake?.55:.15)*(1+Math.sin(time*1.2+phase)*.12);
    });
    for(let i=0;i<fireflyCount;i++) {
      const d=fireflies[i]; dummy.position.set(d.x+Math.sin(time*.21+d.phase)*.23,
        d.y+Math.sin(time*.35+d.phase)*.17,d.z+Math.cos(time*.2+d.phase)*.2);
      dummy.scale.setScalar(economy()&&i>10?0:1); dummy.rotation.set(0,0,0); dummy.updateMatrix(); sparks.setMatrixAt(i,dummy.matrix);
    }
    sparks.instanceMatrix.needsUpdate=true;
    heartLight.intensity=(awake?24:16)*(1+Math.sin(time*2.1)*.025);
    draw(false);
  }
  function stopFallback() {
    window.cancelAnimationFrame(fallbackFrame); window.clearTimeout(fallbackTimer);
    fallbackFrame=fallbackTimer=0; last=0;
  }
  function scheduleFallback() {
    if(!canAnimate()||fallbackFrame||fallbackTimer) return;
    fallbackTimer=window.setTimeout(()=>{
      fallbackTimer=0;
      fallbackFrame=window.requestAnimationFrame(now=>{
        fallbackFrame=0; render(now,last?now-last:33); last=now; scheduleFallback();
      });
    },economy()?66:33);
  }
  const loop=motion?.createLoop(render,{fps:()=>economy()?15:30,
    enabled:()=>active&&!contextLost&&!motion.isScrolling()});
  function resize() {
    if(disposed||contextLost) return;
    const bounds=host.getBoundingClientRect(); width=Math.max(1,bounds.width); height=Math.max(1,bounds.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,economy()?1:1.6));
    renderer.setSize(width,height,false); camera.aspect=width/height; camera.updateProjectionMatrix();
    draw();
  }
  function policy() {
    if(disposed||contextLost) return;
    host.dataset.modelMotion=canAnimate()?'running':'paused';
    host.dataset.modelQuality=economy()?'economy':'full';
    rain.visible=canAnimate(); sparks.visible=canAnimate();
    const reflectionSize=economy()?256:512;
    const reflectionTarget=water.getRenderTarget();
    if(reflectionTarget.width!==reflectionSize) {reflectionTarget.setSize(reflectionSize,reflectionSize);reflectionDirty=true;}
    renderer.shadowMap.needsUpdate=true;
    resize();
    if(canAnimate()) { if(loop) loop.start(); else scheduleFallback(); }
    else { loop?.stop(); stopFallback(); draw(); }
  }
  function setActive(value) { active=Boolean(value); policy(); }
  function toggleAwake() {
    awake=!awake; host.dataset.awake=String(awake);
    runes.forEach(({rune,halo})=>{rune.material.opacity=awake?.94:.54; halo.material.opacity=awake?.55:.15;});
    heartLight.intensity=awake?24:16;
    options.onAwake?.(awake); draw();
  }
  const raycaster=new T.Raycaster(), pointer=new T.Vector2();
  function pick(x,y) {
    const bounds=canvas.getBoundingClientRect();
    pointer.set((x-bounds.left)/bounds.width*2-1,-(y-bounds.top)/bounds.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    return raycaster.intersectObjects(pickers,false).length>0;
  }
  const pointers=new Map();
  let anchor=null, pinchDistance=0, moved=false;
  function pointerDown(event) {
    if(event.button!==undefined&&event.button>2) return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    anchor={x:event.clientX,y:event.clientY,azimuth:orbit.azimuth,polar:orbit.polar,button:event.button,type:event.pointerType};
    drag=true; moved=false;
    if(event.pointerType!=='touch') canvas.setPointerCapture?.(event.pointerId);
    canvas.dataset.dragging='true';
    if(pointers.size===2) {
      const [a,b]=[...pointers.values()]; pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);
    }
  }
  function pointerMove(event) {
    if(!drag||!pointers.has(event.pointerId)||!anchor) return;
    const dx=event.clientX-anchor.x,dy=event.clientY-anchor.y;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size>1) return; // Touch Events own the two-finger gesture.
    if(Math.hypot(dx,dy)>5) moved=true;
    if(anchor.type==='touch'&&Math.abs(dy)>Math.abs(dx)) return; // Preserve page scrolling.
    if(anchor.button===2) {
      target.x=T.MathUtils.clamp(target.x-dx*.002,-1.7,1.7);
      target.z=T.MathUtils.clamp(target.z-dy*.002,-1.7,1.7);
      anchor.x=event.clientX; anchor.y=event.clientY;
    } else {
      orbit.azimuth=anchor.azimuth-dx*.008;
      if(anchor.type!=='touch') orbit.polar=T.MathUtils.clamp(anchor.polar-dy*.006,.56,1.43);
    }
    draw();
  }
  function pointerUp(event) {
    pointers.delete(event.pointerId);
    if(event.type==='pointerup'&&!moved&&anchor&&pick(event.clientX,event.clientY)) toggleAwake();
    if(!pointers.size) {drag=false;anchor=null;canvas.dataset.dragging='false';}
    pinchDistance=0;
  }
  function wheel(event) {
    event.preventDefault(); orbit.zoom=T.MathUtils.clamp(orbit.zoom*Math.exp(event.deltaY*.0011),.61,1.75); draw();
  }
  function touchMove(event) {
    if(event.touches.length!==2) return;
    event.preventDefault(); moved=true;
    const [a,b]=event.touches, distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    if(pinchDistance) {orbit.zoom=T.MathUtils.clamp(orbit.zoom*pinchDistance/distance,.61,1.75);draw();}
    pinchDistance=distance;
  }
  function contextMenu(event) { event.preventDefault(); }
  function reset() { orbit.azimuth=.72;orbit.polar=1.02;orbit.zoom=1;target.set(0,1.65,0);draw(); }
  function keydown(event) {
    const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_',' ','r','R','Home'];
    if(!keys.includes(event.key)) return;
    event.preventDefault();
    if(event.key==='ArrowLeft') orbit.azimuth-=.16;
    if(event.key==='ArrowRight') orbit.azimuth+=.16;
    if(event.key==='ArrowUp') orbit.polar=T.MathUtils.clamp(orbit.polar-.1,.56,1.43);
    if(event.key==='ArrowDown') orbit.polar=T.MathUtils.clamp(orbit.polar+.1,.56,1.43);
    if(event.key==='+'||event.key==='=') orbit.zoom=T.MathUtils.clamp(orbit.zoom*.9,.61,1.75);
    if(event.key==='-'||event.key==='_') orbit.zoom=T.MathUtils.clamp(orbit.zoom*1.1,.61,1.75);
    if(event.key===' ') toggleAwake();
    if(event.key==='r'||event.key==='R'||event.key==='Home') reset();
    draw();
  }
  const bindings=[['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],
    ['pointercancel',pointerUp],['lostpointercapture',pointerUp],['wheel',wheel,{passive:false}],
    ['touchmove',touchMove,{passive:false}],['contextmenu',contextMenu],['keydown',keydown]];
  bindings.forEach(([name,fn,config])=>canvas.addEventListener(name,fn,config));
  const resizeObserver=new ResizeObserver(resize); resizeObserver.observe(host);
  const themeObserver=new MutationObserver(()=>{
    renderer.toneMappingExposure=document.documentElement.dataset.resolvedTheme==='light'?1.02:1.12; draw();
  });
  themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-resolved-theme']});
  const onLost=event=>{event.preventDefault();contextLost=true;loop?.stop();stopFallback();options.onFallback?.();};
  const onRestored=()=>{contextLost=false;renderer.shadowMap.needsUpdate=true;options.onReady?.();policy();};
  canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
  const onVisibility=()=>policy();
  document.addEventListener('visibilitychange',onVisibility); reduced.addEventListener('change',policy);
  const unsubscribe=motion?.subscribe(policy);
  function destroy() {
    if(disposed) return;
    disposed=true; loop?.stop();stopFallback();resizeObserver.disconnect();themeObserver.disconnect();
    document.removeEventListener('visibilitychange',onVisibility);reduced.removeEventListener('change',policy);
    if(typeof unsubscribe==='function') unsubscribe();
    bindings.forEach(([name,fn,config])=>canvas.removeEventListener(name,fn,config));
    canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);
    water.dispose();resources.forEach(item=>item.dispose());renderer.dispose();
  }
  // The static render is complete before replacing the poster, including a
  // useful frozen rain/water state when the user prefers less movement.
  active=true;renderer.shadowMap.needsUpdate=true;resize();render(performance.now(),33);
  ripples.forEach(({mesh,phase})=>{mesh.scale.setScalar(.08+phase*.35);mesh.material.opacity=.12;});
  draw();options.onReady?.();policy();
  return {setActive,destroy,reset,policy,toggleAwake};
}
