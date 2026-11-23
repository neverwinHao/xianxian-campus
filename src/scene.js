(function () {
  'use strict';
  const T = window.THREE;
  window.createCampusScene = function (host, onChoose, onManual) {
    if (!T) throw new Error('Three.js 文件未能加载，请保留完整项目目录。');
    const renderer = new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color(0xe4e8dc).convertSRGBToLinear();
    const camera = new T.PerspectiveCamera(41,1,1,3000);
    const controls = new T.OrbitControls(camera,renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .08;
    controls.minDistance = 12; controls.maxDistance = 1900;
    controls.maxPolarAngle = Math.PI*.475;
    controls.screenSpacePanning = false;
    const hemisphere = new T.HemisphereLight(0xf7f9ff,0x8c9878,.55); scene.add(hemisphere);
    const sun = new T.DirectionalLight(0xfff3d6,.95); sun.position.set(-180,320,160); sun.castShadow = true;
    sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-300,right:300,top:300,bottom:-300,near:1,far:900});
    sun.shadow.normalBias = .4; sun.shadow.bias = -.00015; scene.add(sun);
    const fill = new T.DirectionalLight(0xe6f3ff,.15); fill.position.set(180,100,-180); scene.add(fill);
    const floor = new T.Mesh(new T.PlaneGeometry(4000,4000),new T.MeshStandardMaterial({color:new T.Color(0xe4e8dc).convertSRGBToLinear(),roughness:1}));
    floor.rotation.x = -Math.PI/2; floor.position.y=-1.5;floor.receiveShadow=true;scene.add(floor);
    let root, campus, places=[], picking=[], batches, materials, animation=null, running=true, requestId, lastFrame=0, photoLens=false, walker=null, uniform='blue';
    const boxGeometry = new T.BoxGeometry(1,1,1), sphereGeometry = new T.IcosahedronGeometry(1,1), trunkGeometry = new T.CylinderGeometry(.7,1,1,6);
    const roofGeometry = new T.BufferGeometry();
    roofGeometry.setAttribute('position',new T.Float32BufferAttribute([
      -.5,0,-.5,.5,0,-.5,.5,0,.5,-.5,0,.5,-.5,1,0,.5,1,0
    ],3));
    roofGeometry.setIndex([0,4,5,0,5,1,3,2,5,3,5,4,0,3,4,1,5,2,0,1,2,0,2,3]);roofGeometry.computeVertexNormals();
    const cylinderGeometry=new T.CylinderGeometry(1,1,1,12),diskGeometry=new T.CircleGeometry(1,16);
    const domeGeometry=new T.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2);
      // A small fan blade with a split tip, instanced into open sprays of leaves.
      const ginkgoLeafGeometry=new T.BufferGeometry(),vertices=[0,-.35,0];
      for(let i=0;i<=6;i++){
        const a=.12+i*(Math.PI-.24)/6,r=i===3?.57:.73;
        vertices.push(Math.cos(a)*r,Math.sin(a)*r,Math.sin(a)*.1);
      }
      const indices=[];for(let i=1;i<7;i++)indices.push(0,i,i+1);
      ginkgoLeafGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));ginkgoLeafGeometry.setIndex(indices);ginkgoLeafGeometry.computeVertexNormals();
    const sharedGeometry=[boxGeometry,sphereGeometry,trunkGeometry,roofGeometry,cylinderGeometry,diskGeometry,domeGeometry,ginkgoLeafGeometry];
    const temp = new T.Object3D();
    function mat(key,color,roughness=.85) {
      if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color:new T.Color(color).convertSRGBToLinear(),roughness}));
      return materials.get(key);
    }
    function add(geometry,material,x,y,z,w,h,d,rotation=0) {
      const key = geometry.uuid+material.uuid;
      if(!batches.has(key))batches.set(key,{geometry,material,matrices:[]});
      temp.position.set(x,y,z);temp.scale.set(w,h,d);temp.rotation.set(0,rotation,0);temp.updateMatrix();
      batches.get(key).matrices.push(temp.matrix.clone());
    }
    function box(x,y,z,w,h,d,material,rotation=0){add(boxGeometry,material,x,y,z,w,h,d,rotation);}
    function finishBatches(){
      for(const batch of batches.values()){
        const mesh = new T.InstancedMesh(batch.geometry,batch.material,batch.matrices.length);
        batch.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
        mesh.castShadow = true;mesh.receiveShadow = true;mesh.instanceMatrix.needsUpdate=true;root.add(mesh);
      }
    }
    function line(points,color=0xf3efdf){
      const geometry=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));
      const mesh=new T.Line(geometry,new T.LineBasicMaterial({color}));root.add(mesh);return mesh;
    }
    function shape(points,y,material){
      const outline=new T.Shape();points.forEach(([x,z],i)=>i?outline.lineTo(x,-z):outline.moveTo(x,-z));outline.closePath();
      const mesh=new T.Mesh(new T.ShapeGeometry(outline),material);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.receiveShadow=true;root.add(mesh);return mesh;
    }
    function ovalPoints(x,z,r,straight){
      const points=[];
      for(let i=0;i<=40;i++){const a=Math.PI+i*Math.PI/40;points.push([x+Math.cos(a)*r,z-straight/2+Math.sin(a)*r]);}
      for(let i=0;i<=40;i++){const a=i*Math.PI/40;points.push([x+Math.cos(a)*r,z+straight/2+Math.sin(a)*r]);}
      return points;
    }
    function textSign(text,w,h){
      const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;
      const context=canvas.getContext('2d');context.fillStyle='#f1eee1';context.fillRect(0,0,1024,160);
      context.fillStyle='#884139';context.textAlign='center';context.textBaseline='middle';context.font='600 86px "Songti SC",serif';context.fillText(text,512,86,960);
      const texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;
      const material=new T.MeshStandardMaterial({map:texture,roughness:.8,side:T.DoubleSide});
      return new T.Mesh(new T.PlaneGeometry(w,h),material);
    }
    // Architecture is parameterized separately from the accepted site plan.
    const profiles={
      red:{wall:0xc16d58,trim:0xefeee7,roof:'metal',floors:5,spacing:5.3,ac:true},
      redFlat:{wall:0xc27562,trim:0xedece5,roof:'flat',floors:5,spacing:5.3,ac:true},
      observatory:{wall:0xc16d58,trim:0xefeee7,roof:'flat',floors:6,spacing:5.3,ac:true},
      gray:{wall:0xbcbeb7,trim:0xe9e9e1,roof:'flat',floors:3,spacing:5.6,ac:true},
      hall:{wall:0xc9c4ae,trim:0xece8db,roof:'metal',floors:3,spacing:6.5,ac:false},
      inferred:{wall:0xd6cfb9,trim:0xf0ede2,roof:'metal',floors:4,spacing:5.3,ac:false}
    };
    function beam(a,b,r,material){
      const start=new T.Vector3(...a),end=new T.Vector3(...b),direction=end.clone().sub(start);
      const key=cylinderGeometry.uuid+material.uuid;
      if(!batches.has(key))batches.set(key,{geometry:cylinderGeometry,material,matrices:[]});
      temp.position.copy(start.add(end).multiplyScalar(.5));temp.scale.set(r,direction.length(),r);
      temp.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());temp.updateMatrix();
      batches.get(key).matrices.push(temp.matrix.clone());
    }
    // South's blue-roof teaching courts and three-storey science building.
    // Canvas lettering is generated locally; no photographs or texture files load.
    function inscription(text,w,h,vertical=false,color='#9e3034'){
      const canvas=document.createElement('canvas');canvas.width=vertical?128:512;canvas.height=vertical?512:128;
      const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='600 '+(vertical?100:96)+'px "Kaiti SC","STKaiti","KaiTi","Songti SC",serif';
      if(vertical)[...text].forEach((c,i)=>ctx.fillText(c,64,512*(i+.5)/text.length));
      else ctx.fillText(text,256,68,500);
      const texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;
      return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.12,side:T.DoubleSide,roughness:.9}));
    }
    function southRoof(x,z,w,d,y){
      const long=Math.max(w,d),short=Math.min(w,d),rise=Math.min(2.8,short*.18),rot=d>w?Math.PI/2:0;
      const roof=mat('southBlueRoof',0x71b5d2),edge=mat('southRoofEdge',0xc5d6da),seam=mat('southRoofSeam',0x5b9fbe);
      const q=localBuilder({x,z,rotation:rot}),inset=Math.min(short/2,long*.34);
      add(hipGeometry(long+.7,short+.7,rise),roof,x,y,z,1,1,1,rot);
      for(const side of [-1,1]){
        q.box(0,y+.02,side*(short/2+.35),long+.8,.18,.22,edge);
        q.beam([side*(long/2-inset),y+rise,0],[side*(long/2+.35),y,short/2+.35],.045,edge);
        q.beam([side*(long/2-inset),y+rise,0],[side*(long/2+.35),y,-short/2-.35],.045,edge);
        for(let u=-long/2+inset;u<=long/2-inset;u+=.75)q.beam([u,y+rise+.025,0],[u,y+.03,side*(short/2+.3)],.019,seam);
      }
      q.box(0,y+rise+.07,0,long-2*inset,.14,.2,edge);
    }
    function southPhotoBlock(x,z,w,d,h,profile,options={}){
      if(profile==='southLibrary'){southLibrary(x,z,w,d,h);return;}
      const science=profile==='southScience',entry=profile==='southEntry',canteen=profile==='southCanteen',dorm=profile==='southDorm';
      const wall=mat('southIvoryWall',0xe0e2db),trim=mat('southPhotoTrim',0xb7c3c3),frame=mat('southPhotoFrame',0xc2d1d5);
      const glass=mat('southPhotoGlass',0x385766,.3),sill=mat('southPhotoSill',0xcbd4d0);
      const floors=options.floors||(entry?2:science||canteen?3:4),step=h/floors;
      box(x,h/2,z,w,h,d,wall);
      box(x,.45,z,w+.14,.9,d+.14,mat('southRoseBase',0xb49791));
      for(let face=0;face<4;face++){
        const along=face<2?w:d,depth=face<2?d:w,side=face%2?-1:1,end=along<25;
        function panel(u,y,v,pw,ph,pd,m){
          if(face<2)box(x+u,y,z+side*(depth/2+v),pw,ph,pd,m);
          else box(x+side*(depth/2+v),y,z+u,pd,ph,pw,m);
        }
        panel(0,h-.25,.12,along,.28,.24,trim);
        for(let f=1;f<floors;f++)panel(0,f*step-.1,.03,along,.1,.08,sill);
        for(const u of [-along/2+.28,along/2-.28])panel(u,h/2,.06,.10,h,.12,trim);
        const bays=Math.max(1,Math.floor(along/(science?6.4:dorm?4.6:5.5))),pitch=along/bays;
        const ww=Math.min(end?2.1:science?3.9:dorm?2.25:3.0,pitch*.63),wh=step*.54;
        for(let f=0;f<floors;f++)for(let b=0;b<bays;b++){
          if(science&&end&&b!==Math.floor(bays/2))continue;
          const u=-along/2+(b+.5)*pitch,y=f*step+step*.58;
          panel(u,y,.06,ww+.14,wh+.14,.12,frame);panel(u,y,.14,ww,wh,.05,glass);
          for(let s=1;s<4;s++)panel(u-ww/2+s*ww/4,y,.18,.05,wh,.035,frame);
          panel(u,y+wh*.27,.18,ww,.065,.04,frame);
          panel(u,y-wh/2-.08,.20,ww+.22,.12,.30,sill);
          if(f>0&&b%3===1){
            panel(u+ww/2+.5,y-wh/2-.42,.48,.9,.63,.63,mat('southPhotoAC',0xd6d5c8));
            panel(u+ww/2+.5,y-wh/2-.42,.82,.55,.4,.04,mat('southPhotoACVent',0x7e8b88));
          }
        }
        if(!end){
          for(let u=-along/2+11;u<along/2-2;u+=11)panel(u,h/2,.045,.075,h,.07,trim);
          panel(0,1.8,.12,3.8,3.6,.22,glass);panel(0,3.65,1,5,.2,2,trim);
          for(const u of [-1.8,0,1.8])panel(u,1.8,.25,.07,3.6,.06,frame);
          for(let i=0;i<3;i++)panel(0,.12+i*.16,1.9-i*.42,5.1,.24+i*.32,.6,sill);
        }
      }
      box(x,h+.06,z,w+.45,.2,d+.45,trim);southRoof(x,z,w,d,h+.2);
      if(science){
        const sign=inscription(options.roofName||'献中科技楼',21,3.3);
        sign.position.set(x,h+3.8,z-d*.3);sign.rotation.y=Math.PI;root.add(sign);
        for(let u=-9;u<=9;u+=4.5)beam([x+u,h+.4,z-d*.3],[x+u,h+4.6,z-d*.3],.05,mat('signStand',0x8b9390));
      }
    }
    function southLibrary(x,z,w,d,h){
      const wall=mat('libraryTaupe',0x9c8d86),edge=mat('libraryStone',0xc1b8ad),glass=mat('libraryJadeGlass',0x579992,.3),frame=mat('libraryFrame',0x718f8a);
      box(x,h/2,z,w,h,d,wall);box(x,.55,z,w+1,1.1,d+1,edge);
      // Central tall window strip and stepped parapet seen in the approach photo.
      box(x,h+.6,z,18,1.2,d,wall);
      for(const side of [-1,1]){
        const front=z+side*(d/2+.08);
        box(x,h*.56,front,13,h*.72,.16,glass);
        for(let u=-6.5;u<=6.5;u+=2.16)box(x+u,h*.56,front+side*.1,.11,h*.72,.14,frame);
        for(let yy=5;yy<h-1;yy+=1.95)box(x,yy,front+side*.1,13,.1,.14,frame);
        for(const dx of [-26,-19,19,26])for(let f=0;f<5;f++){
          box(x+dx,3+f*4.55,front,3,2.7,.17,glass);
          box(x+dx,3+f*4.55,front+side*.1,.09,2.7,.1,edge);
        }
      }
      for(const side of [-1,1])for(let dz=-d/2+4;dz<d/2;dz+=6)for(let f=0;f<5;f++)box(x+side*(w/2+.09),3+f*4.55,z+dz,.18,2.7,3.1,glass);
      box(x,h+.16,z,w+.35,.3,d+.35,edge);box(x,h+.36,z,w-1,.12,d-1,mat('libraryRoof',0x8f9690));
      box(x,1.9,z-d/2-.1,10,3.8,.3,mat('libraryEntrance',0x354e50));
      box(x,4.1,z-d/2-2.1,18,.5,4.4,edge);
      for(let i=0;i<4;i++)box(x,.12+i*.18,z-d/2-4+i*.7,19-i,.24+i*.36,.9,edge);
      const sign=inscription('图 书 馆',20,3.8);sign.position.set(x,h+2.6,z-d/2);sign.rotation.y=Math.PI;root.add(sign);
      for(const dx of [-7,0,7])beam([x+dx,h,z-d/2],[x+dx,h+3.3,z-d/2],.07,mat('signStand',0x8b9390));
    }
    function southTeachingCourt(b){
      const wing=b.wing||10,ends=b.d-2*wing;
      for(const side of [-1,1]){
        southPhotoBlock(b.x,b.z+side*(b.d-wing)/2,b.w,wing,b.h,'southTeaching');
        southPhotoBlock(b.x+side*(b.w-wing)/2,b.z,wing,ends,b.h,'southTeaching');
      }
      const divider=8;
      southPhotoBlock(b.x,b.z,divider,ends,b.h-4.5,'southTeaching');
      // Projecting corner stairwells articulate the long courtyard wings.
      for(const side of [-1,1])southPhotoBlock(b.x+(b.w-wing)/2+.5,b.z+side*(b.d-wing)/2,wing+1,wing+4,b.h+1,'southTeaching');
      const label=inscription('教学楼',2.6,9.2,true);
      label.position.set(b.x+b.w/2+1.07,b.h*.60,b.z-b.d/2+2);label.rotation.y=Math.PI/2;root.add(label);
      const cw=(b.w-2*wing-divider)/2;
      for(const side of [-1,1])ginkgoGarden(b.x+side*(divider/2+cw/2),b.z,cw-1,ends-1);
    }
    function southDormCourt(b){
      // The rear western dormitory has one open court, unlike the teaching block.
      const wing=b.wing||10,innerW=b.w-2*wing,innerD=b.d-2*wing;
      for(const side of [-1,1]){
        southPhotoBlock(b.x,b.z+side*(b.d-wing)/2,b.w,wing,b.h,b.profile,b);
        southPhotoBlock(b.x+side*(b.w-wing)/2,b.z,wing,innerD,b.h,b.profile,b);
      }
      const paving=mat('southDormCourtPaving',0xc9cbbc),grass=mat('southDormCourtGrass',0x9eab87);
      box(b.x,.23,b.z,innerW,.25,innerD,paving);
      for(const side of [-1,1]){
        const x=b.x+side*innerW*.27;
        box(x,.4,b.z,innerW*.28,.3,innerD*.48,grass);
        tree(x,b.z,.72,true);
      }
    }
    function hipGeometry(w,d,rise){
      const inset=Math.min(d*.5,w*.34),geometry=new T.BufferGeometry();
      geometry.setAttribute('position',new T.Float32BufferAttribute([
        -w/2,0,-d/2,w/2,0,-d/2,w/2,0,d/2,-w/2,0,d/2,-w/2+inset,rise,0,w/2-inset,rise,0
      ],3));
      geometry.setIndex([0,4,5,0,5,1,3,2,5,3,5,4,0,3,4,1,5,2]);geometry.computeVertexNormals();return geometry;
    }
    function northRoof(x,z,w,d,y,options={}){
      const rise=options.roofHeight||Math.min(3.4,d*.16),blue=mat('northBlueTile',0x3e7d9f),silver=mat('northRoofEdge',0xcbd6d8);
      const inset=Math.min(d*.5,w*.34);
      add(hipGeometry(w+.9,d+.9,rise),blue,x,y,z,1,1,1);
      for(const side of [-1,1]){
        box(x,y+.05,z+side*(d/2+.4),w+1,.16,.22,silver);
        beam([x+side*(w/2-inset),y+rise+.08,z],[x+side*(w/2+.4),y+.05,z-d/2-.4],.075,silver);
        beam([x+side*(w/2-inset),y+rise+.08,z],[x+side*(w/2+.4),y+.05,z+d/2+.4],.075,silver);
        for(let u=-w/2+inset;u<w/2-inset;u+=1.2)beam([x+u,y+rise+.025,z],[x+u,y+.04,z+side*d/2],.018,mat('northTileSeam',0x6094b0));
      }
      box(x,y+rise+.09,z,w-2*inset,.16,.20,silver);
      // The photographs resolve framed dark roof panels, not their energy technology.
      if(options.roofPanels){
        const angle=Math.atan(rise/(d/2)),dark=mat('northRoofPanel',0x414d58,.38);
        for(let u=-w/2+inset+1.2;u<w/2-inset-1;u+=2.5)for(const v of [d*.21,d*.37]){
          const py=y+rise*(1-v/(d/2))+.25,pd=d*.145;
          const key=boxGeometry.uuid+dark.uuid;
          if(!batches.has(key))batches.set(key,{geometry:boxGeometry,material:dark,matrices:[]});
          temp.position.set(x+u,py,z+v);temp.scale.set(2.18,.12,pd/Math.cos(angle));temp.rotation.set(angle,0,0);temp.updateMatrix();batches.get(key).matrices.push(temp.matrix.clone());
          const at=(dx,dz)=>[x+u+dx,py-rise*dz/(d/2)+.075,z+v+dz];
          for(const dx of [-1.12,1.12])beam(at(dx,-pd/2),at(dx,pd/2),.035,silver);
          for(const dz of [-pd/2,0,pd/2])beam(at(-1.12,dz),at(1.12,dz),.027,silver);
        }
      }
      box(x-w*.23,y+rise*.65+.65,z-d*.21,1.25,1.2,1.3,mat('northRoofVent',0xb4b8ae));
    }
    function northPhotoBlock(x,z,w,d,h,profile,options={}){
      const plain=profile==='northPlain',link=profile==='northLink';
      const wall=mat('northBrick',0xc27261),white=mat('northWhiteTrim',0xeee9df),frame=mat('northFrame',0xd4d9d5);
      const glass=mat('northWindow',0x3d5159,.28),base=mat('northBase',0x777d76);
      const floors=link?3:5,step=h/floors;
      box(x,h/2,z,w,h,d,wall);box(x,.4,z,w+.2,.8,d+.2,base);
      for(let face=0;face<4;face++){
        const along=face<2?w:d,depth=face<2?d:w,side=face%2?-1:1;
        const end=along<31&&!link;
        function panel(u,y,v,pw,ph,pd,m){
          if(face<2)box(x+u,y,z+side*(depth/2+v),pw,ph,pd,m);
          else box(x+side*(depth/2+v),y,z+u,pd,ph,pw,m);
        }
        panel(0,h-step*.43,.08,along,step*.86,.16,white);
        panel(0,h+.1,.2,along+.7,.30,.62,white);
        const bays=end?2:Math.max(2,Math.floor(along/(plain?5.7:5.1))),pitch=along/bays;
        const ww=end?1.7:Math.min(link?4.5:plain?2.65:3.6,pitch*.72),wh=step*.56;
        for(let f=0;f<floors;f++){
          panel(0,f*step+.16,.12,along,.15,.24,white);
          for(let b=0;b<bays;b++){
            const u=end?(-along*.22+b*along*.44):-along/2+(b+.5)*pitch,y=f*step+step*.59;
            panel(u,y,.14,ww+.18,wh+.18,.18,frame);panel(u,y,.25,ww,wh,.08,glass);
            for(let t=1;t<4;t++)panel(u-ww/2+ww*t/4,y,.31,.055,wh,.04,frame);
            panel(u,y+wh*.25,.31,ww,.065,.04,frame);
            panel(u,y-wh/2-.1,.23,ww+.3,.13,.45,white);
            if(!end&&!link&&f>0&&b%2===0){
              panel(u+ww*.4,y-wh/2-.55,.5,.9,.65,.6,mat('northAC',0xd8d3c6));
              panel(u+ww*.4,y-wh/2-.55,.82,.62,.4,.04,mat('northACVent',0x7a8784));
            }
          }
        }
        if(!plain&&!end)for(let b=0;b<=bays;b++)panel(-along/2+b*pitch,h/2,.23,.52,h,.45,white);
        for(const u of [-along/2+.25,along/2-.25])panel(u,h/2,.2,.4,h,.38,white);
        if(end){
          panel(0,1.6,.2,2.4,3.2,.4,glass);
          panel(0,3.5,1.15,5,.25,2.6,mat('northBlueTile',0x3e7d9f));
          for(let i=0;i<3;i++)panel(0,.12+i*.15,1.7-i*.4,5,.24+i*.3,.6,base);
        }
      }
      northRoof(x,z,w,d,h+.3,options);
    }
    function northCanteen(x,z,w,d,h,options={}){
      const orange=mat('canteenOrange',0xbe7761),stone=mat('canteenStone',0xc8c7be),base=mat('canteenBase',0x7b8380);
      const glass=mat('canteenGlass',0x475956,.32),frame=mat('canteenFrame',0xd5d9d3),dark=mat('canteenDoor',0x303e3e);
      box(x,h/2,z,w,h,d,orange);box(x,.6,z,w+.18,1.2,d+.18,base);
      const floor=h/2,windowHeight=floor*.72;
      for(let face=0;face<4;face++){
        const along=face<2?w:d,depth=face<2?d:w,side=face%2?-1:1;
        const panel=(u,y,v,pw,ph,pd,m)=>face<2?box(x+u,y,z+side*(depth/2+v),pw,ph,pd,m):box(x+side*(depth/2+v),y,z+u,pd,ph,pw,m);
        const count=face<2?8:4,pitch=along/count;
        for(let i=0;i<count;i++){
          const u=-along/2+(i+.5)*pitch;
          for(let level=0;level<2;level++){
            if(face===0&&level===0&&Math.abs(u)<5)continue;
            const y=floor*level+floor*.59,ww=pitch-.5;
            panel(u,y,.08,ww,windowHeight,.16,glass);
            for(let j=0;j<=4;j++)panel(u-ww/2+j*ww/4,y,.2,.08,windowHeight,.07,frame);
            panel(u,y+windowHeight*.25,.2,ww,.085,.07,frame);
            panel(u,y-windowHeight/2,.2,ww,.12,.25,stone);
          }
        }
        for(let i=0;i<=count;i++){
          const u=-along/2+i*pitch;
          panel(u,h/2,.24,.32,h,.48,stone);
          for(let y=1;y<h;y+=1.4)panel(u,y,.49,.33,.035,.02,base);
        }
        panel(0,h+.07,.25,along+.8,.3,.72,stone);
        panel(0,.85,.18,along,.18,.4,stone);
      }
      // A simple blue pitched roof replaces the former gridded public-hall roof.
      northRoof(x,z,w,d,h+.3,{roofHeight:2,roofPanels:false});
      const front=z+d/2;
      box(x,2.2,front+.14,7.8,4.4,.28,dark);
      for(const u of [-3.75,-1.25,1.25,3.75])box(x+u,2.1,front+.36,.12,4.2,.12,frame);
      for(const side of [-1,1]){
        box(x+side*4.7,3.4,front+.6,1.25,6.8,1.2,orange);
        box(x+side*4.7,.9,front+.65,1.28,1.8,1.3,base);
        box(x+side*5.4,4,front+.67,.25,8,1.35,stone);
      }
      // Curved underside of the pale entrance fascia, visible in the reference.
      const arch=new T.Shape();arch.moveTo(-4.1,6.5);arch.lineTo(4.1,6.5);arch.lineTo(4.1,4.2);
      arch.quadraticCurveTo(0,5.6,-4.1,4.2);arch.closePath();
      const fascia=new T.Mesh(new T.ShapeGeometry(arch),stone);fascia.position.set(x,0,front+1.28);root.add(fascia);
      const sign=inscription(options.name||'食堂',6.2,1.0,false,'#3d4542');sign.position.set(x,5.85,front+1.32);root.add(sign);
      box(x,7.8,front+.24,6.8,2.4,.15,glass);box(x,6.62,front+.85,8.2,.22,1.65,stone);
      for(const u of [-3.2,0,3.2])box(x+u,7.8,front+.37,.1,2.4,.1,frame);
      for(let i=0;i<5;i++)box(x,.13+i*.15,front+4.5-i*.65,12-i*.3,.26+i*.3,.85,stone);
      // Planters and simple benches along the dining-hall frontage.
      for(const side of [-1,1]){
        box(x+side*16,.23,front+5.6,10,.35,2.4,stone);
        box(x+side*16,.43,front+5.6,9.5,.06,1.9,mat('canteenSoil',0xa99d7d));
        tree(x+side*16,front+5.6,.7,true);
        box(x+side*14,1.15,front+1.3,8,.25,.8,mat('canteenBench',0x746e5c));
        box(x+side*14,1.85,front+.99,8,1.1,.2,mat('canteenBench',0x746e5c));
        for(const u of [-3,3])box(x+side*14+u,.6,front+1.3,.22,1.1,.6,base);
      }
    }
    function buildingBlock(x,z,w,d,h,roofColor,profile='red',options={}){
      if(profile.startsWith('south')){southPhotoBlock(x,z,w,d,h,profile,options);return;}
      if(profile==='northCanteen'){northCanteen(x,z,w,d,h,options);return;}
      if(profile.startsWith('north')){northPhotoBlock(x,z,w,d,h,profile,options);return;}
      const cfg=profiles[profile]||profiles.inferred;
      const wall=mat('wall'+cfg.wall,cfg.wall),trim=mat('architecturalTrim'+cfg.trim,cfg.trim);
      const glass=mat('glass',0x46616a,.22),dark=mat('glassShade',0x2f444a,.28),frame=mat('aluminium',0xcbd1ca,.42);
      const floors=cfg.floors,step=h/floors;
      box(x,h/2,z,w,h,d,wall);
      box(x,.6,z,w+.28,1.2,d+.28,mat('stonePlinth',0x90968e));
      // Four façades share window construction, while each profile has its own rhythm.
      for(let face=0;face<4;face++){
        const along=face<2?w:d,depth=face<2?d:w,side=face%2?-1:1;
        function panel(u,y,v,pw,ph,pd,material){
          if(face<2)box(x+u,y,z+side*(depth/2+v),pw,ph,pd,material);
          else box(x+side*(depth/2+v),y,z+u,pd,ph,pw,material);
        }
        const bays=Math.max(1,Math.floor((along-1.2)/cfg.spacing)),pitch=(along-1.2)/bays,ww=Math.min(3.7,pitch-1.1),wh=Math.min(2.15,step*.59);
        panel(0,h-step*.43,.055,along,step*.86,.16,trim);
        for(let b=0;b<=bays;b++){
          const u=-along/2+.6+b*pitch;
          panel(u,h/2,.16,profile==='gray'?.3:.64,h-.5,.32,trim);
          if(profile==='red'||profile==='redFlat')panel(u,h/2,.34,.12,h-.7,.035,mat('pierInset',0xb7bdb7));
        }
        for(let f=0;f<floors;f++){
          const y=f*step+step*.61;
          panel(0,f*step+.22,.15,along,.16,.32,trim);
          for(let b=0;b<bays;b++){
            const u=-along/2+.6+(b+.5)*pitch;
            panel(u,y,.14,ww+.23,wh+.22,.16,frame);
            panel(u,y,.25,ww,wh,.09,(b+f)%4===0?dark:glass);
            for(let m=1;m<4;m++)panel(u-ww/2+ww*m/4,y,.31,.065,wh,.06,frame);
            panel(u,y+wh*.25,.32,ww,.075,.07,frame);
            panel(u,y-wh/2-.14,.25,ww+.38,.15,.58,trim);
            if((b+f)%3===1)panel(u+ww*.125,y-wh*.08,.33,ww*.21,wh*.63,.035,mat('windowReflection',0x657c7f,.28));
            if(cfg.ac&&f>0&&(b%2===0||profile==='red')){
              const ax=u+ww*.35,ay=y-wh/2-.57;
              panel(ax,ay,.57,.95,.6,.58,mat('acUnit',0xcecfc3));
              panel(ax,ay,.88,.72,.42,.04,mat('acVent',0x78827d));
              for(let q=-1;q<=1;q++)panel(ax,ay+q*.11,.91,.68,.032,.025,frame);
              for(const q of [-.35,.35])panel(ax+q,ay-.37,.51,.07,.12,.83,mat('bracket',0x737c74));
            }
          }
        }
        // Projecting cornice and individual eave brackets visible in the photos.
        panel(0,h+.1,.24,along+.7,.32,.75,trim);
        for(let u=-along/2+1;u<along/2;u+=2.1)panel(u,h-.43,.37,.22,.48,.58,trim);
        for(const u of [-along/2+.2,along/2-.2])panel(u,h/2,.42,.12,h,.15,mat('downpipe',0xbfc7be));
      }
      box(x,h+.36,z,w+1.25,.25,d+1.25,trim);
      if(cfg.roof==='metal'){
        const rh=Math.min(1.6,d*.07),roof=mat('roof'+roofColor,roofColor||0x637f8a);
        add(roofGeometry,roof,x,h+.46,z,w+1.2,rh,d+1.2);
        for(let u=-w/2;u<=w/2;u+=1.15){
          for(const side of [-1,1])beam([x+u,h+.49,z+side*(d+.9)/2],[x+u,h+.46+rh,z],.027,mat('roofSeam',0x81959b));
        }
        box(x,h+.5+rh,z,w+1.4,.16,.3,mat('roofSeam',0x81959b));
      }else{
        box(x,h+.53,z,w,.15,d,mat('flatRoof',0xaeb4ab));
        for(const side of [-1,1]){
          box(x,h+.96,z+side*(d/2-.25),w,.95,.36,trim);
          box(x+side*(w/2-.25),h+.96,z,.36,.95,d,trim);
        }
        box(x-w*.28,h+1.1,z,3.5,1.25,2.5,mat('roofEquipment',0xa3aaa0));
      }
      // Recessed entrance, transparent-looking doors, stair treads and canopy.
      box(x,1.65,z+d/2+.38,3.5,3.3,.45,dark);
      for(const u of [-1.68,0,1.68])box(x+u,1.65,z+d/2+.65,.09,3.3,.08,frame);
      box(x,3.48,z+d/2+1.05,5.5,.27,2.5,trim);
      for(let i=0;i<3;i++)box(x,.12+i*.15,z+d/2+1.7-i*.45,5.5-i*.2,.24+i*.3,1.1,trim);
    }
    function buildBuilding(b){
      if(b.courtyard&&campus.id==='south'){
        if(b.profile==='southDorm')southDormCourt(b);else southTeachingCourt(b);
      }else if(b.parts){
        for(const part of b.parts)buildingBlock(part.x,part.z,part.w,part.d,part.h,b.roofColor,part.profile||b.profile,part);
      }else if(b.courtyard){
        const wing=11;
        buildingBlock(b.x,b.z-b.d/2+wing/2,b.w,wing,b.h,b.roofColor,b.profile);
        buildingBlock(b.x,b.z+b.d/2-wing/2,b.w,wing,b.h,b.roofColor,b.profile);
        buildingBlock(b.x-b.w/2+wing/2,b.z,wing,b.d-2*wing,b.h,b.roofColor,b.profile);
        buildingBlock(b.x+b.w/2-wing/2,b.z,wing,b.d-2*wing,b.h,b.roofColor,b.profile);
        garden(b.x,b.z,b.w-28,b.d-27);
      }else{
        buildingBlock(b.x,b.z,b.w,b.d,b.h,b.roofColor,b.profile,b);
        if(b.endTowers)for(const side of [-1,1])northPhotoBlock(b.x+side*(b.w/2-5),b.z+.9,10,b.d+2,b.h+1.2,'northPlain',{roofHeight:2.3});
        if(b.wing)buildingBlock(b.x+(b.wing==='west'?-1:1)*(b.w/2-7),b.z-12,14,28,b.h,b.roofColor,b.profile);
      }
      // Picking volumes keep hit-testing independent of instanced façade detail.
      const proxy=new T.Mesh(new T.BoxGeometry(b.w,b.h+3,b.d),new T.MeshBasicMaterial({visible:false}));
      proxy.position.set(b.x,b.h/2,b.z);proxy.userData.place=b.id;root.add(proxy);picking.push(proxy);
    }
    let random;
    function tree(x,z,size=1,located=false){
      if(!located&&Math.hypot(x-campus.gate.x,z-campus.gate.z)<(campus.id==='south'?62:campus.id==='north'?45:30))return;
      if(campus.id==='north'&&z>campus.gate.z&&Math.abs(x-campus.gate.x)<75)return;
      box(x,2.4*size,z,.55*size,4.8*size,.55*size,mat('trunk',0x7d7760));
      const tint=random()>.6?'leafLight':'leafDark';const leaf=mat(tint,tint==='leafLight'?0x8ea46d:0x729361);
      add(sphereGeometry,leaf,x,6*size,z,3.25*size,4.1*size,3.1*size,random()*6);
      add(sphereGeometry,mat('leafAccent',0x9caf7b),x+1.6*size,5.8*size,z-1.1*size,2.2*size,2.7*size,2.2*size);
    }
    function garden(x,z,w,d){
      if(w<=0||d<=0)return;
      box(x,.24,z,w,.4,d,mat('grass',0xa7b78b));
      box(x,.46,z,w,.08,2,mat('path',0xdedaca));
      box(x,.46,z,2,.08,d,mat('path',0xdedaca));
      for(let dx=-w/2+4;dx<w/2-2;dx+=10){
        tree(x+dx,z-d/2+3,.72+random()*.3);
        if(d>16)tree(x+dx,z+d/2-3,.8+random()*.2);
      }
      const hedge=mat('hedge',0x788e5e);
      if(w>15)box(x,.8,z-d/2,w-3,1.25,1.5,hedge);
    }
    function track(f){
      shape(ovalPoints(f.x,f.z,f.r+3,f.straight),.22,mat('trackBorder',0xd9c7ac));
      shape(ovalPoints(f.x,f.z,f.r,f.straight),.26,mat('track',0xb67760));
      shape(ovalPoints(f.x,f.z,f.r-8,f.straight),.3,mat('field',0x7a9a68));
      for(let i=0;i<6;i++){
        const pts=ovalPoints(f.x,f.z,f.r-i*1.35,f.straight).map(([x,z])=>[x,.34,z]);pts.push(pts[0]);line(pts,0xeadac3);
      }
      const fw=(f.r-11)*2,fd=f.straight+f.r*.85;
      for(let i=0;i<10;i++)box(f.x,.33,f.z-fd/2+(i+.5)*fd/10,fw,.035,fd/10,mat('stripe'+i%2,i%2?0x789866:0x829f70));
      line([[f.x-fw/2,.4,f.z-fd/2],[f.x+fw/2,.4,f.z-fd/2],[f.x+fw/2,.4,f.z+fd/2],[f.x-fw/2,.4,f.z+fd/2],[f.x-fw/2,.4,f.z-fd/2]]);
      line([[f.x-fw/2,.4,f.z],[f.x+fw/2,.4,f.z]]);
      const circle=[];for(let i=0;i<=64;i++)circle.push([f.x+Math.cos(i*Math.PI/32)*7,.4,f.z+Math.sin(i*Math.PI/32)*7]);line(circle);
      for(let side of [-1,1]){
        const z=f.z+side*fd/2;
        line([[f.x-14,.4,z],[f.x-14,.4,z-side*13],[f.x+14,.4,z-side*13],[f.x+14,.4,z]]);
        box(f.x-3.7,1.65,z,.18,2.7,.18,mat('white',0xf9f7e9));box(f.x+3.7,1.65,z,.18,2.7,.18,mat('white',0xf9f7e9));box(f.x,3,z,7.6,.18,.18,mat('white',0xf9f7e9));
      }
      for(let i=0;i<4;i++)box(f.x-f.r-6-i*1.3,.35+i*.5,f.z,1.5,.7+i,Math.min(70,f.straight),mat('stand',0xc7c0ad));
      const proxy=new T.Mesh(new T.BoxGeometry(f.r*2,2,f.straight+f.r*2),new T.MeshBasicMaterial({visible:false}));proxy.position.set(f.x,.5,f.z);proxy.userData.place=f.id;root.add(proxy);picking.push(proxy);
    }
    function court(c){
      box(c.x,.25,c.z,c.w,.3,c.d,mat('courtGreen',0x718d7d));
      const count=c.w>34?2:1;
      for(let i=0;i<count;i++){
        const x=c.x+(i-(count-1)/2)*17;
        box(x,.43,c.z,14,.05,28,mat('courtRed',0xac8873));
        line([[x-7,.49,c.z-14],[x+7,.49,c.z-14],[x+7,.49,c.z+14],[x-7,.49,c.z+14],[x-7,.49,c.z-14]]);
        line([[x-7,.49,c.z],[x+7,.49,c.z]]);
        const pts=[];for(let j=0;j<=32;j++)pts.push([x+Math.cos(j*Math.PI/16)*2.5,.49,c.z+Math.sin(j*Math.PI/16)*2.5]);line(pts);
        for(const side of [-1,1]){box(x,2,c.z+side*13,.3,4,.3,mat('hoop',0x647c75));box(x,4,c.z+side*12.7,2.2,1.3,.2,mat('white',0xf9f7e9));}
      }
    }
    function localBuilder(g){
      const c=Math.cos(g.rotation||0),s=Math.sin(g.rotation||0);
      const point=(x,y,z)=>[g.x+x*c+z*s,y,g.z-x*s+z*c];
      return {
        point,
        box:(x,y,z,w,h,d,m)=>box(...point(x,y,z),w,h,d,m,g.rotation||0),
        beam:(a,b,r,m)=>beam(point(...a),point(...b),r,m),
        line:(points,color)=>line(points.map(p=>point(...p)),color),
        sign:(text,x,y,z,w,h,vertical=false)=>{
          const sign=vertical?verticalSign(text,w,h):textSign(text,w,h);
          sign.position.set(...point(x,y,z));sign.rotation.y=(g.rotation||0)+Math.PI;root.add(sign);return sign;
        }
      };
    }
    function verticalSign(text,w,h){
      const canvas=document.createElement('canvas');canvas.width=192;canvas.height=1024;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#e3dfce';ctx.fillRect(0,0,192,1024);
      ctx.fillStyle='#303931';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 116px "Kaiti SC","Songti SC",serif';
      [...text].forEach((letter,i)=>ctx.fillText(letter,96,102+(i*820/Math.max(1,text.length-1))));
      const texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;
      return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:texture,side:T.DoubleSide,roughness:.85}));
    }
    function retractable(q,x,z,width){
      const steel=mat('gateSteel',0x586660,.48);
      for(let u=-width/2;u<width/2;u+=1){
        q.box(x+u,1.3,z,.085,2.5,.75,steel);
        for(const depth of [-.36,.36]){
          q.beam([x+u,.3,z+depth],[x+u+1,2.1,z+depth],.055,steel);
          q.beam([x+u,2.1,z+depth],[x+u+1,.3,z+depth],.055,steel);
        }
        q.box(x+u,.17,z,.3,.3,.95,steel);
      }
      q.box(x,2.5,z,width,.1,.78,steel);
      q.box(x+width/2,1.3,z,.7,2.6,1.05,mat('gateMotor',0x7d8780));
    }
    function gate(g){
      const q=localBuilder(g),stone=mat('gateStone',0x9c9d93),trim=mat('gateTrim',0xd7d9ce),joint=mat('stoneJoint',0x7a827c),steel=mat('gateSteel',0x586660,.48);
      q.box(0,.04,0,37,.18,20,mat('gatePaving',0xc4c7bb));
      if(campus.id==='south'){
        // Round 7 gate close-up supersedes the older horizontal-name-wall photograph.
        const clad=mat('southGateClad',0xabb5b0),panel=mat('southGatePanel',0xc6ccc5);
        const base=mat('southGateDarkBase',0x5d625b);
        q.box(-14,.09,1,86,.24,23,mat('gatePaving',0xc4c7bb));
        q.box(0,6,0,2.35,12,2.7,clad);
        q.box(0,.5,0,2.5,1,2.9,base);
        for(const x of [-.18,.18])q.beam([x,12,0],[x,25.2,0],.075,steel);
        q.beam([-.18,25.2,0],[.18,25.2,0],.075,steel);
        // Central ridge, shallow mid-wing sag, and raised tips. Span / pier height
        // follows the supplied front photograph instead of the old oversized canopy.
        for(const side of [-1,1]){
          const curve=t=>[side*t*16.5,12.55-1.6*Math.sin(Math.PI*t)+.16*t,0];
          const outline=new T.Shape();
          for(let i=0;i<=48;i++){const [x,y]=curve(i/48);if(i===0)outline.moveTo(x,y+.38);else outline.lineTo(x,y+.38);}
          for(let i=48;i>=0;i--){const [x,y]=curve(i/48);outline.lineTo(x,y-.48);}outline.closePath();
          const canopy=new T.Mesh(new T.ExtrudeGeometry(outline,{depth:3.5,bevelEnabled:false,steps:1}),clad);
          canopy.position.set(...q.point(0,0,-1.75));canopy.rotation.y=g.rotation;canopy.castShadow=true;canopy.receiveShadow=true;root.add(canopy);
          for(const depth of [-1.78,1.78]){
            for(let i=0;i<48;i++){
              const a=curve(i/48),b=curve((i+1)/48);
              q.beam([a[0],a[1]-.48,depth],[b[0],b[1]-.48,depth],.035,steel);
              q.beam([a[0],a[1]+.38,depth],[b[0],b[1]+.38,depth],.025,steel);
            }
            for(let i=1;i<=16;i++){const [x,y]=curve(i/16);q.beam([x,y-.46,depth],[x,y+.36,depth],.021,joint);}
          }
          for(const t of [.64,1])for(const depth of [-1.35,1.35]){
            const end=curve(t),pts=[];
            for(let i=0;i<=28;i++){
              const u=i/28;pts.push([end[0]*u,24.9*(1-u)+(end[1]+.4)*u-2.2*Math.sin(Math.PI*u),depth*u]);
            }
            for(let i=1;i<pts.length;i++)q.beam(pts[i-1],pts[i],.023,steel);
          }
        }
        // Current reference: a round emblem above the right-side name pier.
        q.box(-31,6.15,0,3.3,12.3,2.8,panel);
        q.sign('河北省献县第一中学',-31,6.5,-1.44,2.6,9.0,true);
        for(const y of [3.1,6.2,9.3])q.box(-31,y,-1.46,3.3,.04,.035,joint);
        const badgeCanvas=document.createElement('canvas');badgeCanvas.width=badgeCanvas.height=256;
        const badge=badgeCanvas.getContext('2d');badge.fillStyle='#cfbc91';badge.beginPath();badge.arc(128,128,120,0,Math.PI*2);badge.fill();
        badge.strokeStyle='#8d4b40';badge.lineWidth=8;badge.stroke();badge.beginPath();badge.arc(128,128,99,0,Math.PI*2);badge.lineWidth=3;badge.stroke();
        badge.fillStyle='#9b3a39';badge.font='600 148px "Kaiti SC","STKaiti",serif';badge.textAlign='center';badge.textBaseline='middle';badge.fillText('献',128,135);
        const badgeTexture=new T.CanvasTexture(badgeCanvas);badgeTexture.encoding=T.sRGBEncoding;
        const badgeMesh=new T.Mesh(new T.PlaneGeometry(4,4),new T.MeshStandardMaterial({map:badgeTexture,transparent:true,alphaTest:.1,side:T.DoubleSide}));
        badgeMesh.position.set(...q.point(-31,14.2,0));badgeMesh.rotation.y=Math.PI;root.add(badgeMesh);
        for(const dx of [-1.2,1.2])q.beam([-31+dx,12.2,0],[-31,14.1,0],.07,steel);
        const guard=mat('southGuardRed',0xb87870);
        q.box(-38,2.5,3.7,10,5,7,guard);q.box(-38,5.1,3.7,10.7,.25,7.7,clad);
        for(const x of [-41,-37,-34]){q.box(x,2.8,.14,2,2.15,.18,mat('southPhotoGlass',0x385766));q.box(x,2.8,0,.07,2.15,.06,trim);}
        // Open vehicle passage to the right of the pier; folded/partly extended gates.
        retractable(q,-22,1.35,13);
        retractable(q,4.7,1.35,6.1);
        q.box(9,1.15,0,2.5,2.3,1.3,panel);
        q.box(24,1.05,0,27,2.1,1.3,panel);
        for(let x=11;x<38;x+=1.3)q.box(x,2.8,.15,.08,1.5,.08,steel);
        q.box(24,3.5,.15,27,.1,.12,steel);
        // The low pale building and trees visible behind the left boundary wall.
        buildingBlock(g.x+14,g.z+12,11,9,7.8,undefined,'southEntry');
        buildingBlock(g.x+25,g.z+21,13,12,8.3,undefined,'southEntry');
        for(const [x,z,size] of [[20,-4,1.9],[23,4,1.85],[34,8,1.75],[42,13,1.6],[19,11,1.65]])tree(g.x+x,g.z+z,size,true);
        // Receding tree line marks the open drive in the reference photograph.
        for(const z of [39,54,70,86])tree(g.x+2,g.z+z,.75,true);
        // Seated stone lions with stepped bases, mane curls, paws and a front ball.
        // Their ornament remains an approximate sculptural silhouette.
        const lion= (x,z,scale=1)=>{
          const pos=(dx,y,dz)=>q.point(x+dx*scale,y*scale,z+dz*scale);
          const lb=(dx,y,dz,w,h,d,m)=>q.box(x+dx*scale,y*scale,z+dz*scale,w*scale,h*scale,d*scale,m);
          lb(0,.3,0,3.3,.6,3.8,clad);lb(0,.78,0,2.8,.36,3.2,panel);lb(0,1.08,0,3,.24,3.4,clad);
          add(sphereGeometry,panel,...pos(0,2.25,.3),1.0*scale,1.35*scale,1.25*scale);
          add(sphereGeometry,clad,...pos(0,3.7,-.15),1.22*scale,1.35*scale,1.12*scale);
          add(sphereGeometry,panel,...pos(0,3.6,-.85),.85*scale,.85*scale,.70*scale);
          lb(0,3.34,-1.45,.65,.20,.30,clad);
          for(const side of [-1,1]){
            lb(side*.7,2.03,-.8,.45,1.65,.58,panel);
            lb(side*.7,1.3,-1.18,.7,.28,1.0,panel);
            add(sphereGeometry,panel,...pos(side*.8,4.5,-.4),.3*scale,.37*scale,.3*scale);
          }
          for(let a=0;a<Math.PI*2;a+=Math.PI/5)add(sphereGeometry,panel,...pos(Math.cos(a)*1.05,3.8+Math.sin(a)*1.05,-.4),.28*scale,.27*scale,.3*scale);
          add(sphereGeometry,clad,...pos(-.7,1.53,-1.28),.5*scale,.5*scale,.5*scale);
        };
        lion(-56,-1.4,1.38);lion(39,-1,1.04);
      }else if(campus.id==='north'){
        // The 2019 route photograph locates this name pier beside the B teaching block.
        const pier=mat('northNamePier',0x57443d),orange=mat('guardOrange',0xb96750),blue=mat('guardBlue',0x496f87);
        q.box(-15,4.5,0,3,9,3,pier);
        for(const y of [1.8,3.6,5.4,7.2])q.box(-15,y,-1.52,3,.035,.035,joint);
        q.sign('献县第一中学',-15,4.3,-1.56,1.75,6.2,true);
        const badgeCanvas=document.createElement('canvas');badgeCanvas.width=badgeCanvas.height=256;
        const badge=badgeCanvas.getContext('2d');badge.beginPath();badge.arc(128,128,118,0,Math.PI*2);badge.fillStyle='#d7bc76';badge.fill();badge.strokeStyle='#8d643e';badge.lineWidth=9;badge.stroke();
        badge.beginPath();badge.arc(128,128,98,0,Math.PI*2);badge.lineWidth=3;badge.stroke();badge.fillStyle='#895b31';badge.font='bold 136px "Kaiti SC","Songti SC",serif';badge.textAlign='center';badge.textBaseline='middle';badge.fillText('献',128,132);
        const badgeTexture=new T.CanvasTexture(badgeCanvas);badgeTexture.encoding=T.sRGBEncoding;
        const medal=new T.Mesh(new T.PlaneGeometry(2.8,2.8),new T.MeshStandardMaterial({map:badgeTexture,transparent:true,alphaTest:.1,side:T.DoubleSide}));medal.position.set(...q.point(-15,10.25,-.2));medal.rotation.y=g.rotation+Math.PI;root.add(medal);
        // Guardroom roof is low; the observatory is a separate tower on the teaching building.
        q.box(-22,2.55,3,11,5.1,8,orange);
        add(roofGeometry,blue,...q.point(-22,5.3,3),12,1.35,9,g.rotation);
        for(const x of [-25,-21,-17.8]){
          q.box(x,2.65,-1.06,2.3,2.35,.16,mat('aluminium',0xcbd1ca,.42));
          q.box(x,2.65,-1.16,2.07,2.1,.08,mat('glass',0x46616a,.22));
          q.box(x,2.65,-1.22,.075,2.1,.08,trim);
        }
        // Rectangular open canopy visible in the school account's 2024 group photograph.
        for(const z of [-1,5])q.box(1,8.1,z,27,.7,1.25,trim);
        for(const x of [-12,14])q.box(x,8.1,2,1.25,.7,7.2,trim);
        q.box(14,3.95,2,1.25,7.9,1.25,stone);
        for(let x=-11;x<=13;x+=1.6)for(const z of [-1.64,5.64])q.box(x,8.1,z,.035,.68,.025,joint);
        // Side pedestrian shelter, a second feature visible in the 2019 route photograph.
        for(const x of [17,23])q.box(x,2.5,3,.55,5,.55,trim);
        add(roofGeometry,blue,...q.point(20,5.1,3),9,2,9,g.rotation);
        retractable(q,-5,1,13);
        q.box(15,.04,14,28,.15,19,mat('gatePaving',0xc4c7bb));
      }
      for(const x of (campus.id==='south'?[]:[-9,-6,6,9])){
        q.box(x,.75,-7,.24,1.5,.24,mat('bollard',0xc9ad50));q.box(x,1,-7,.26,.2,.26,mat('bollardRed',0x8f5143));
      }
      const crossingX=campus.id==='south'?-16:0;
      for(let x=-5;x<=5;x+=1.5)q.box(crossingX+x,-.055,-23,.65,.04,15,mat('crossing',0xf0eedb));
      const proxy=new T.Mesh(new T.BoxGeometry(campus.id==='south'?106:campus.id==='north'?80:35,26,24),new T.MeshBasicMaterial({visible:false}));
      proxy.position.set(...q.point(campus.id==='south'?-9:0,13,0));proxy.rotation.y=g.rotation;proxy.userData.place='gate';root.add(proxy);picking.push(proxy);
    }
    function observatory(o){
      northPhotoBlock(o.x,o.z,o.w,o.d,o.h,'northPlain',{roofHeight:1.4});
      const metal=mat('observatoryMetal',0xbac5c8,.35),rim=mat('observatoryRim',0x818e92,.45);
      const base=o.h+2.1,r=4.5,height=5;
      add(cylinderGeometry,rim,o.x,base-.45,o.z,r,.9,r);
      add(domeGeometry,metal,o.x,base,o.z,r,height,r);
      // Meridional ribs and a raised paired observation shutter, inferred from visible seams.
      for(let a=0;a<Math.PI*2;a+=Math.PI/12){
        const pts=[];
        for(let i=0;i<=24;i++){const t=i*Math.PI/48;pts.push([o.x+(r+.035)*Math.sin(t)*Math.cos(a),base+(height+.035)*Math.cos(t),o.z+(r+.035)*Math.sin(t)*Math.sin(a)]);}
        line(pts,0x6c746f);
      }
      for(const dx of [-.36,.36]){
        const pts=[];
        for(let i=0;i<=32;i++){const t=i*Math.PI/32;pts.push([o.x+dx,base+5.06*Math.sin(t),o.z+4.54*Math.cos(t)]);}
        for(let i=1;i<pts.length;i++)beam(pts[i-1],pts[i],.075,rim);
      }
      const proxy=new T.Mesh(new T.BoxGeometry(o.w,o.h+8,o.d),new T.MeshBasicMaterial({visible:false}));
      proxy.position.set(o.x,(o.h+8)/2,o.z);proxy.userData.place='observatory';root.add(proxy);picking.push(proxy);
    }
    function ginkgoTree(x,z,size=1){
      const bark=mat('ginkgoBark',0x777368),leaf=[mat('ginkgoGold',0xe4b541),mat('ginkgoLight',0xf2cd59),mat('ginkgoOchre',0xc99532)];
      leaf.forEach(m=>{m.side=T.DoubleSide;});
      const spray=(cx,cy,cz,r,count)=>{
        for(let n=0;n<count;n++){
          const a=random()*Math.PI*2,rr=Math.sqrt(random())*r;
          const geometry=ginkgoLeafGeometry,material=leaf[n%3],key=geometry.uuid+material.uuid;
          if(!batches.has(key))batches.set(key,{geometry,material,matrices:[]});
          const scale=(.28+random()*.23)*size;
          temp.position.set(cx+Math.cos(a)*rr,cy+(random()-.5)*r*.75,cz+Math.sin(a)*rr);
          temp.scale.set(scale,scale,scale);temp.rotation.set((random()-.5)*2.5,random()*6.28,random()*.8);temp.updateMatrix();
          batches.get(key).matrices.push(temp.matrix.clone());
        }
      };
      beam([x,.4,z],[x,13.4*size,z],.24*size,bark);
      for(let layer=0;layer<5;layer++){
        const y=(4.8+layer*1.8)*size,spread=(5.2-layer*.72)*size;
        for(let i=0;i<6;i++){
          const angle=i*Math.PI/3+layer*.48,ex=x+Math.cos(angle)*spread,ez=z+Math.sin(angle)*spread;
          beam([x,y,z],[ex,y+1.6*size,ez],(.11-layer*.014)*size,bark);
          for(let j=0;j<4;j++){
            const t=.4+j*.2,cx=x+(ex-x)*t,cz=z+(ez-z)*t;
            spray(cx,y+(1.5*t+.2)*size,cz,1.25*size,22);
          }
        }
      }
      spray(x,13.9*size,z,1.45*size,130);
    }
    function ginkgoGarden(x,z,w,d){
      const soil=mat('southGardenSoil',0x929678),hedge=mat('southGardenHedge',0x637c4d),path=mat('southGardenPath',0xc5c1aa);
      box(x,.22,z,w,.30,d,soil);
      // A rounded loop leaves a planted center and a walking edge beside the walls.
      const points=[];
      for(let i=0;i<=48;i++){const a=i*Math.PI/24;points.push([x+Math.cos(a)*w*.35,.43,z+Math.sin(a)*d*.35]);}
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[2]-a[2]);
        box((a[0]+b[0])/2,.42,(a[2]+b[2])/2,length+.2,.10,1.65,path,-Math.atan2(b[2]-a[2],b[0]-a[0]));
      }
      for(const dx of [-w*.30,w*.30]){
        ginkgoTree(x+dx,z-d*.19,.95);
        for(let i=0;i<65;i++){
          const a=random()*Math.PI*2,r=Math.sqrt(random())*5;
          add(sphereGeometry,mat('fallenGinkgo',0xc9a34e),x+dx+Math.cos(a)*r,.43,z-d*.19+Math.sin(a)*r,.12,.025,.09,a);
        }
      }
      for(let i=0;i<15;i++){
        const a=i*Math.PI*2/15;
        add(sphereGeometry,hedge,x+Math.cos(a)*w*.19,.8,z+Math.sin(a)*d*.20,1.8,.85,1.35,a);
      }
      for(const side of [-1,1]){
        box(x+side*w*.35,.8,z+d*.29,4,.35,1.1,mat('gardenBench',0x8b7760));
        for(const dx of [-1.5,1.5])box(x+side*w*.35+dx,.43,z+d*.29,.25,.65,.8,path);
      }
    }
    function pavilionRoof(x,z,r,y,rise){
      const segments=60,rings=[0,.18,.37,.57,.76,.9,1],vertices=[],indices=[],tile=mat('pavilionTile',0x824841);
      tile.side=T.DoubleSide;
      function point(u,i){
        const a=i*2*Math.PI/segments,sector=(i%10)/10,c=2*Math.PI/6;
        const va=Math.floor(i/10)*c,vb=va+c;
        const px=(Math.cos(va)*(1-sector)+Math.cos(vb)*sector)*r*u,pz=(Math.sin(va)*(1-sector)+Math.sin(vb)*sector)*r*u;
        const yy=y+rise*Math.pow(1-u,2)+.65*Math.pow(u,7)*Math.pow(Math.abs(2*sector-1),5);
        return [x+px,yy,z+pz];
      }
      for(const u of rings)for(let i=0;i<=segments;i++)vertices.push(...point(u,i));
      for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){
        const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);
      }
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
      const mesh=new T.Mesh(geometry,tile);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
      const trim=mat('pavilionRidge',0xac7060);
      for(let i=0;i<segments;i++){
        const a=point(1,i),b=point(1,i+1);beam(a,b,.075,trim);
        for(let j=1;j<rings.length;j++)beam(point(rings[j-1],i),point(rings[j],i),i%10===0?.105:.027,trim);
        if(i%10===0){const end=point(1,i);beam(end,[x+(end[0]-x)*1.05,end[1]+.7,z+(end[2]-z)*1.05],.095,trim);}
      }
    }
    function southPavilion(p){
      const {x,z}=p,red=mat('pavilionLacquer',0x992e31),dark=mat('pavilionDarkWood',0x493d36),stone=mat('pavilionBase',0xc5c9c2);
      const hex=new T.CylinderGeometry(1,1,1,6);
      add(hex,stone,x,.28,z,5.25,.56,5.25);add(hex,stone,x,.65,z,4.65,.3,4.65);
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3,b=(i+1)*Math.PI/3,cx=x+Math.cos(a)*3.25,cz=z+Math.sin(a)*3.25,nx=x+Math.cos(b)*3.25,nz=z+Math.sin(b)*3.25;
        beam([cx,.8,cz],[cx,5.65,cz],.19,red);box(cx,.9,cz,.62,.55,.62,dark);
        beam([cx,5.25,cz],[nx,5.25,nz],.16,dark);
        if(i!==0){beam([cx,1.8,cz],[nx,1.8,nz],.075,dark);beam([cx,1.05,cz],[nx,1.05,nz],.08,red);}
        for(let j=1;j<6;j++){
          const t=j/6,px=cx+(nx-cx)*t,pz=cz+(nz-cz)*t;
          if(i!==0)beam([px,1.06,pz],[px,1.8,pz],.04,red);
          beam([px,4.65,pz],[px,5.3,pz],.035,dark);
        }
        const ux=x+Math.cos(a)*2.35,uz=z+Math.sin(a)*2.35,vx=x+Math.cos(b)*2.35,vz=z+Math.sin(b)*2.35;
        beam([ux,7.15,uz],[ux,9.35,uz],.14,red);
        for(const yy of [7.45,8.15,8.65,9.25])beam([ux,yy,uz],[vx,yy,vz],.065,dark);
        for(let j=1;j<5;j++){const t=j/5;beam([ux+(vx-ux)*t,7.45,uz+(vz-uz)*t],[ux+(vx-ux)*t,9.25,uz+(vz-uz)*t],.035,stone);}
        beam([cx,4.7,cz],[x+Math.cos(a)*4.5,5.7,z+Math.sin(a)*4.5],.085,red);
      }
      pavilionRoof(x,z,5.65,5.5,2.0);pavilionRoof(x,z,4.4,9.3,2.6);
      add(cylinderGeometry,dark,x,12.05,z,.32,.6,.32);add(sphereGeometry,mat('pavilionFinial',0xad755c),x,12.48,z,.4,.45,.4);
      for(let i=0;i<3;i++)box(x+4.5+i*.48,.5-i*.14,z+1.8,1.1,.6-i*.14,2.2,stone);
      const proxy=new T.Mesh(new T.BoxGeometry(12,13,12),new T.MeshBasicMaterial({visible:false}));proxy.position.set(x,6.5,z);proxy.userData.place='pavilion';root.add(proxy);picking.push(proxy);
    }
    function southLandscape(){
      const grass=mat('southEntryGrass',0x9caa86),hedge=mat('southEntryHedge',0x6e8356),stone=mat('southStonePath',0xc6c5b8);
      box(-87,.22,-140,77,.3,15,grass);
      box(-89,.8,-147,74,1.15,1.5,hedge);
      const points=[[-40,-139],[-46,-140],[-50,-142],[-56,-143],[-62,-139]];
      for(let i=1;i<points.length;i++){
        const [ax,az]=points[i-1],[bx,bz]=points[i],length=Math.hypot(bx-ax,bz-az),rotation=-Math.atan2(bz-az,bx-ax);
        box((ax+bx)/2,.45,(az+bz)/2,length+1,.14,2.0,stone,rotation);
        for(let t=0;t<length;t+=.7){
          const f=t/length;box(ax+(bx-ax)*f,.54,az+(bz-az)*f,.035,.015,1.9,mat('southStoneJoint',0x9da69b),rotation);
        }
      }
      southPavilion(campus.pavilion);
      for(const x of [-116,-100,-82])ginkgoTree(x,-142,.74);
      // Narrow evergreen silhouettes along the teaching-building approach.
      const leaf=mat('southCypress',0x526d4b);
      for(const z of [-88,-78,-68,-58,-48,-32,-20,-8,7,21]){
        box(-25,3,z,.35,6,.35,mat('trunk',0x7d7760));
        for(let i=0;i<4;i++)add(sphereGeometry,leaf,-25,4+i*2.1,z,2.2-i*.4,3.2,2.2-i*.4);
      }
    }
    function northSculpture(s){
      const q=localBuilder({x:s.x,z:s.z,rotation:0});
      const silver=mat('northSculptureSilver',0xc2cbc9,.3);silver.metalness=.55;
      const polished=mat('northSculptureEdge',0xe0e5df,.24);polished.metalness=.55;
      const base=mat('northSculpturePlinth',0x976c65),stone=mat('northSculpturePaving',0xc3c3b7),leaf=mat('northSculptureHedge',0x6c8052);
      q.box(0,.32,0,21,.18,21,stone);
      q.box(0,.73,0,4.2,.75,4.2,base);q.box(0,1.16,0,4.5,.14,4.5,mat('northSculptureCap',0xb4988c));
      for(const [x,z,h,r] of [[-.6,.3,7,.22],[0,0,8.5,.27],[.65,.1,7.7,.21],[-.25,.8,5,.19],[.7,.75,4,.16]]){
        q.beam([x,1.25,z],[x,h,z],r,silver);
        add(sphereGeometry,polished,...q.point(x,h,z),r,.08,r);
      }
      // Solid, thin metal bands follow the photographed S-shaped silhouette.
      function ribbon(points,widths,thickness=.12){
        const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),positions=[],indices=[],steps=56;
        for(let i=0;i<=steps;i++){
          const t=i/steps,p=curve.getPoint(t),tangent=curve.getTangent(t);
          const normal=new T.Vector3(-tangent.y,tangent.x,0).normalize();
          const f=t*(widths.length-1),index=Math.min(widths.length-2,Math.floor(f)),width=T.MathUtils.lerp(widths[index],widths[index+1],f-index);
          for(const [side,depth] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
            const v=p.clone().addScaledVector(normal,side*width/2);v.z+=depth*thickness/2;positions.push(...q.point(v.x,v.y,v.z));
          }
          if(i<steps){const a=i*4,b=a+4;indices.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);}
        }
        indices.push(0,1,2,1,3,2);const end=steps*4;indices.push(end,end+2,end+1,end+1,end+2,end+3);
        const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
        const mesh=new T.Mesh(geometry,silver);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
      }
      ribbon([[.25,1.25,-.5],[2.05,2.8,-.15],[2.9,4.6,.25],[1.3,6.0,.35],[-1.65,6.8,.15],[-2.6,7.6,0],[-1.7,8.8,-.1],[.5,9.4,-.2]],[.85,1.1,.9,.55,.12]);
      // Upper open bowl and rising petal-like blades, without inventing a title.
      ribbon([[-2.9,9.8,-.3],[-1.5,8.8,.1],[.1,8.7,.25],[1.6,9.1,.12],[2.8,10.2,-.3]],[.06,.8,1.05,.75,.05]);
      ribbon([[-2.2,9.65,.45],[-2.3,10.8,.3],[-1.25,11.85,0],[.2,12.1,-.2],[1.6,12.45,-.25]],[.38,.75,.7,.16]);
      ribbon([[-1.1,9.4,-.2],[.45,10.2,-.15],[1.5,11.35,-.5],[2.6,12.6,-.85]],[.08,1.15,.95,.015]);
      ribbon([[-1.25,9.55,.65],[.2,9.9,.8],[1.35,10.5,.85],[2.5,10.7,.7]],[.03,.65,.6,.03]);
      // Two small swept accents visible along the lower band.
      for(const [x,y,z,side] of [[2.45,4.55,.45,1],[-1.5,6.95,.35,-1]]){
        ribbon([[x,y,z],[x+side*.8,y+.55,z+.15],[x+side*1.4,y+.35,z+.25]],[.12,.4,.015],.06);
      }
      // Four planted lobes separated by a cross-shaped paved approach.
      for(let quadrant=0;quadrant<4;quadrant++){
        const start=quadrant*Math.PI/2+.12,end=(quadrant+1)*Math.PI/2-.12,points=[];
        for(let i=0;i<=18;i++){const a=start+(end-start)*i/18;points.push([s.x+Math.cos(a)*9,s.z+Math.sin(a)*9]);}
        for(let i=18;i>=0;i--){const a=start+(end-start)*i/18;points.push([s.x+Math.cos(a)*3.5,s.z+Math.sin(a)*3.5]);}
        shape(points,.44,mat('northSculptureSoil',0x7e8566));
        for(let r=3.8;r<=8.8;r+=1.1)for(let a=start+.03;a<end;a+=1.0/r){
          add(sphereGeometry,leaf,s.x+Math.cos(a)*r,.85,s.z+Math.sin(a)*r,.75,.6,.75,a);
        }
      }
      const proxy=new T.Mesh(new T.BoxGeometry(10,13,8),new T.MeshBasicMaterial({visible:false}));proxy.position.set(s.x,6.5,s.z);proxy.userData.place='sculpture';root.add(proxy);picking.push(proxy);
    }
    function northLandscape(){
      const pavement=mat('northCourtPaving',0xbec2b9),grass=mat('grass',0xa7b78b),hedge=mat('northTrimmedHedge',0x6c8059);
      const stone=mat('northTreePit',0xb9b9a9);
      function car(x,z,rotation,color){
        const q=localBuilder({x,z,rotation}),paint=mat('northCar'+color,color),glass=mat('northCarGlass',0x384b55,.25),tire=mat('northCarTire',0x414443);
        q.box(0,.7,0,2,1,4.4,paint);q.box(0,1.38,-.05,1.73,.65,2.45,paint);
        q.box(0,1.42,-1.3,1.55,.47,.07,glass);q.box(0,1.4,1.22,1.55,.46,.07,glass);
        for(const side of [-1,1]){
          q.box(side*.89,1.44,-.05,.05,.4,2.07,glass);
          for(const dz of [-1.35,1.35])q.box(side, .37,dz,.25,.56,.65,tire);
          q.box(side*.6,.73,-2.23,.42,.2,.06,mat('northCarLamp',0xe5e0c5));
        }
      }
      for(const court of [{x:-76,z:19,w:88,d:34},{x:61,z:18,w:103,d:33}]){
        box(court.x,.24,court.z,court.w,.18,court.d,pavement);
        for(let x=court.x-court.w/2+4;x<court.x+court.w/2;x+=5)box(x,.345,court.z,.05,.018,court.d,mat('northPavingJoint',0xa7aca5));
      }
      for(const x of [-107,-88,-69,-50,15,34,92,108]){
        const z=x<0?19:18;
        add(cylinderGeometry,stone,x,.44,z,1.5,.23,1.5);add(cylinderGeometry,mat('northSoil',0x8c8b76),x,.57,z,1.26,.05,1.26);
        tree(x,z,.64,true);
      }
      for(const [i,x] of [-110,-92,-74,-52,-35,15,37,88,109].entries())car(x,7,Math.PI/2,[0xe3e4db,0x586971,0x3e5057,0x9e5247][i%4]);
      for(const [i,x] of [-103,-78,-42,27,99].entries())car(x,31,-Math.PI/2,[0xedece2,0x405260,0x8e9695][i%3]);
      // Entering from the south gate: the covered walk is on the left (west).
      for(const g of [{x:-77,z:87,w:89,d:29},{x:80,z:88,w:82,d:33}]){
        box(g.x,.27,g.z,g.w,.18,g.d,grass);
        for(const side of [-1,1]){
          box(g.x,.8,g.z+side*g.d/2,g.w,1.15,1.8,hedge);
          box(g.x+side*g.w/2,.8,g.z,1.8,1.15,g.d,hedge);
        }
        box(g.x,.39,g.z,g.w-3,.08,2.2,pavement);
        for(let dx=-g.w/2+8;dx<g.w/2-4;dx+=17)tree(g.x+dx,g.z-g.d/2+5,.95,true);
      }
      const walk=campus.coveredWalk,roof=mat('northWalkTile',0x71594f),red=mat('northWalkColumn',0x9d5e4d),cream=mat('northWalkBase',0xc3bca8);
      for(let i=1;i<walk.points.length;i++){
        const [ax,az]=walk.points[i-1],[bx,bz]=walk.points[i],length=Math.hypot(bx-ax,bz-az),rotation=-Math.atan2(bz-az,bx-ax);
        const q=localBuilder({x:(ax+bx)/2,z:(az+bz)/2,rotation});
        q.box(0,.52,0,length+.4,.24,walk.width+.5,cream);
        add(hipGeometry(length+1,walk.width+.6,1.35),roof,...q.point(0,3.8,0),1,1,1,rotation);
        for(let u=-length/2+.8;u<length/2;u+=3.8)for(const side of [-1,1]){
          q.box(u,2.12,side*1.8,.22,3.25,.22,red);q.box(u,.75,side*1.8,.4,.35,.4,cream);
        }
        for(const side of [-1,1]){
          q.box(0,3.63,side*1.8,length,.22,.25,red);q.box(0,1.02,side*1.9,length,.22,.48,cream);
          for(let u=-length/2;u<length/2;u+=.4)q.beam([u,3.83,side*(walk.width/2+.25)],[u,5.1,0],.024,mat('northWalkTileJoint',0x887368));
        }
      }
      for(const [x,z] of walk.points){
        add(hipGeometry(6,6,2),roof,x,3.8,z,1,1,1);
        for(const dx of [-2,2])for(const dz of [-2,2]){
          beam([x+dx,3.9,z+dz],[x+dx*1.35,4.35,z+dz*1.35],.09,roof);
        }
      }
      const gardenPlace=campus.places.find(p=>p.id==='garden');
      const proxy=new T.Mesh(new T.BoxGeometry(gardenPlace.w,8,gardenPlace.d),new T.MeshBasicMaterial({visible:false}));proxy.position.set(gardenPlace.x,4,gardenPlace.z);proxy.userData.place='garden';root.add(proxy);picking.push(proxy);
      northSculpture(campus.sculpture);
    }
    function reviewingStand(){
      const q=localBuilder({x:15,z:48,rotation:Math.PI/2}),tile=mat('standTile',0xdfded1),metal=mat('railing',0x8e9b97,.4);
      q.box(0,.7,0,28,1.4,9,tile);q.box(0,1.45,0,28.4,.15,9.4,tile);
      for(let i=0;i<7;i++)q.box(0,.1+i*.2,-7+i*.47,9,.2+i*.4,.6,tile);
      for(const x of [-13,13])q.box(x,3.8,3.6,.6,4.7,.6,mat('stageColumn',0xa45b4e));
      q.box(0,6.3,1,29,.32,10,mat('stageRoof',0xbfc7bb));
      for(let x=-13.5;x<=13.5;x+=1.1){
        q.box(x,2.1,-4.5,.07,1.2,.07,metal);
        if(Math.abs(x)>5)q.box(x,1.8,-4.5,.95,.45,.08,mat('railInfill',0x586961));
      }
      q.beam([-14,2.7,-4.5],[14,2.7,-4.5],.065,metal);
      for(const x of [-4.7,4.7])q.beam([x,1,-7.2],[x,2.8,-4],.06,metal);
      for(let i=0;i<3;i++)q.box(0,.15+i*.25,-13,5-i, .3+i*.5,4-i,tile);
      q.beam([0,.8,-13],[0,14,-13],.08,metal);
      const flag=new T.Mesh(new T.PlaneGeometry(3.3,2.2),new T.MeshStandardMaterial({color:0xc54032,side:T.DoubleSide}));flag.position.set(...q.point(1.6,12.7,-13));flag.rotation.y=Math.PI/2;root.add(flag);
    }
    function perimeter(points){
      const wall=mat('wall',0xc7c7b5),metal=mat('fence',0x9aa28d);
      for(let i=0;i<points.length;i++){
        const [ax,az]=points[i], [bx,bz]=points[(i+1)%points.length];
        const length=Math.hypot(bx-ax,bz-az),rotation=-Math.atan2(bz-az,bx-ax);
        // Leave an actual opening in the wall at the selected entrance.
        for(let t=0;t<length;t+=3){
          const f=Math.min(1,(t+1.5)/length),x=ax+(bx-ax)*f,z=az+(bz-az)*f;
          if(Math.hypot(x-campus.gate.x,z-campus.gate.z)<(campus.id==='south'?49:campus.id==='north'?46:19))continue;
          box(x,.45,z,3.05,.9,.7,wall,rotation);box(x,1.3,z,3,.12,.14,metal,rotation);box(x,2.05,z,3,.12,.14,metal,rotation);
          box(x,1.4,z,.16,1.8,.16,metal);
        }
      }
    }
    function street(road){
      const isX=road.axis==='x',w=isX?road.length:22,d=isX?22:road.length;
      box(road.x,-.27,road.z,w+.8,.3,d+.8,mat('street',0xc0c6b7));
      for(let i=-road.length/2;i<road.length/2;i+=14)box(road.x+(isX?i:0),-.09,road.z+(isX?0:i),isX?6:.35,.04,isX?.35:6,mat('streetLine',0xe8e9d9));
      for(const side of [-1,1])for(let i=-road.length/2+10;i<road.length/2;i+=14)tree(road.x+(isX?i:side*17),road.z+(isX?side*17:i),.85+random()*.2);
    }
    function disposeRoot(){
      if(!root)return;
      const geometries=new Set(),mats=new Set(),textures=new Set();
      root.traverse(obj=>{if(obj.geometry && !sharedGeometry.includes(obj.geometry))geometries.add(obj.geometry);if(obj.material){for(const material of (Array.isArray(obj.material)?obj.material:[obj.material])){mats.add(material);if(material.map)textures.add(material.map);}}if(obj.isInstancedMesh)obj.dispose();});
      geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());scene.remove(root);
    }
    function load(data){
      animation=null;walker?.dispose();walker=null;disposeRoot();campus=data;root=new T.Group();scene.add(root);picking=[];batches=new Map();materials=new Map();
      let seed=Array.from(data.id).reduce((n,c)=>n+c.charCodeAt(0),91);random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
      shape(data.boundary,0,mat('pavement',0xdbddcd));
      for(const [x,z,w,d] of data.roads)box(x,.12,z,w,.15,d,mat('walkway',0xeae6d9));
      for(const [i,params] of data.gardens.entries())if(data.id!=='north'||i>1)garden(...params);
      data.buildings.forEach(buildBuilding);if(data.observatory)observatory(data.observatory);data.fields.forEach(track);data.courts.forEach(court);gate(data.gate);if(data.id==='south'){reviewingStand();southLandscape();}perimeter(data.boundary);street(data.road);
      if(data.id==='north'){
        for(const b of data.connectors)northPhotoBlock(b.x,b.z,b.w,b.d,b.h,'northLink',{roofPanels:false,roofHeight:1.1});
        northLandscape();
      }
      for(const [x,z,w,d] of data.roads){
        if(w>50){for(let dx=-w/2+7;dx<w/2-4;dx+=16){
          const px=x+dx,pz=z+d/2+3.8;
          if(!data.buildings.some(b=>Math.abs(px-b.x)<b.w/2+3&&Math.abs(pz-b.z)<b.d/2+4))tree(px,pz,.8+random()*.2);
        }}
      }
      // Small street furniture enriches scale without claiming real fixture locations.
      for(const [x,z] of data.gardens){box(x+7,1,z,5,.35,1.4,mat('bench',0x92765c));box(x+5,.5,z,.3,1,.8,mat('fence',0x9aa28d));box(x+9,.5,z,.3,1,.8,mat('fence',0x9aa28d));}
      finishBatches();walker=window.CampusWalking.create({T,campus,parent:root,camera,controls,canvas:renderer.domElement,uniform});root.updateMatrixWorld(true);
      const allPlaces=[...data.places,...data.buildings,...data.fields,...data.courts];
      places=data.displayIds.map(id=>allPlaces.find(p=>p.id===id)).filter(Boolean);
      for(const proxy of picking){
        const id=data.selectionAliases?.[proxy.userData.place]||proxy.userData.place;
        proxy.userData.place=places.some(p=>p.id===id)?id:null;
      }
      picking=picking.filter(proxy=>proxy.userData.place);
      overview(false);return places;
    }
    function move(position,target,duration=1000){
      controls.autoRotate=false;
      // A photo-aligned street view may look slightly upward from pedestrian height.
      controls.maxPolarAngle=Math.max(Math.PI*.475,Math.acos(T.MathUtils.clamp((position.y-target.y)/position.distanceTo(target),-1,1))+.004);
      if(!duration){camera.position.copy(position);controls.target.copy(target);controls.update();animation=null;return;}
      animation={from:camera.position.clone(),targetFrom:controls.target.clone(),to:position.clone(),targetTo:target.clone(),start:performance.now(),duration};
    }
    function overview(animated=true){
      photoLens=false;configureLens();
      const aspect=host.clientWidth/host.clientHeight;
      const size=Math.max(campus.width,campus.depth),distance=size*1.25/(2*Math.tan(camera.fov*Math.PI/360)*Math.min(1,aspect));
      const direction=(campus.id==='south'?new T.Vector3(-.66,.96,-1):new T.Vector3(.66,.84,1)).normalize();
      move(direction.multiplyScalar(distance),new T.Vector3(0,0,0),animated?1100:0);
    }
    function choose(id,close=false){
      const p=places.find(p=>p.id===id);if(!p)return;
      const aspect=host.clientWidth/host.clientHeight,portrait=Math.max(1,.95/aspect);
      photoLens=(campus.id==='south'&&id==='gate')||(close&&campus.id==='north'&&['a-canteen','b-canteen'].includes(id));configureLens();
      if(id==='gate'){
        if(campus.id==='south'){
          // Preserve the photograph's horizontal field of view on a narrow canvas;
          // moving far away with a narrow lens incorrectly compresses the rear blocks.
          const fit=Math.max(1,Math.tan(41*Math.PI/360)*(600/338)/(Math.tan(camera.fov*Math.PI/360)*aspect));
          const q=localBuilder(campus.gate),distance=(close?62:76)*fit;
          move(new T.Vector3(...q.point(-3,close?2.1:7,-distance)),new T.Vector3(...q.point(-17,close?3.4:7.5,0)),1100);return;
        }
        const q=localBuilder(campus.gate),distance=(campus.id==='north'?90:75)*portrait;
        move(new T.Vector3(...q.point(-distance*.16,close?12:23,-distance)),new T.Vector3(...q.point(0,campus.id==='north'?13:8,campus.id==='north'?20:3)),1100);return;
      }
      if(id==='observatory'){
        const target=new T.Vector3(p.x,close?29:22,p.z);
        move(target.clone().add(new T.Vector3(-19,close?8:14,close?35:61).multiplyScalar(portrait)),target,1100);return;
      }
      if(campus.id==='south'&&id==='library'){
        const target=new T.Vector3(p.x,12,p.z-p.d/2);
        move(target.clone().add(new T.Vector3(close?52:80,close?27:65,close?-58:-95).multiplyScalar(portrait)),target,1100);return;
      }
      if(campus.id==='south'&&id==='dorm-west'){
        const target=new T.Vector3(p.x,8,p.z);
        move(target.clone().add(new T.Vector3(close?42:67,close?76:103,close?-48:-90).multiplyScalar(portrait)),target,1100);return;
      }
      if(campus.id==='south'&&id==='dorm-east'){
        const target=new T.Vector3(p.x,6,p.z);
        move(target.clone().add(new T.Vector3(close?43:80,close?24:64,close?-36:-60).multiplyScalar(portrait)),target,1100);return;
      }
      if(campus.id==='south'&&id==='ginkgo-court'){
        const target=new T.Vector3(-76,5,-62);
        move(target.clone().add(new T.Vector3(15,close?100:132,close?21:50).multiplyScalar(portrait)),target,1100);return;
      }
      if(campus.id==='south'&&id==='pavilion'){
        const target=new T.Vector3(p.x,6,p.z);
        move(target.clone().add(new T.Vector3(close?18:31,close?5:22,close?-19:-38).multiplyScalar(portrait)),target,1100);return;
      }
      if(campus.id==='north'&&['a-canteen','b-canteen'].includes(id)){
        const side=id==='a-canteen'?1:-1,target=new T.Vector3(p.x,4.8,p.z+p.d*.22);
        move(target.clone().add(new T.Vector3(side*(close?32:68),close?10:52,close?18:44).multiplyScalar(portrait)),target,1100);return;
      }
      if(campus.id==='north'&&id==='courtyard'){
        const target=new T.Vector3(64,11,23);
        move(target.clone().add(new T.Vector3(68,105,75).multiplyScalar(portrait)),target,1100);return;
      }
      if(campus.id==='north'&&id==='garden'){
        const target=new T.Vector3(p.x,2,p.z);
        move(target.clone().add(new T.Vector3(close?18:24,close?20:50,close?34:78).multiplyScalar(portrait)),target,1100);return;
      }
      if(campus.id==='north'&&id==='sculpture'){
        const target=new T.Vector3(p.x,close?6:3,p.z);
        move(target.clone().add(new T.Vector3(close?13:27,close?8:33,close?21:50).multiplyScalar(portrait)),target,1100);return;
      }
      const scale=Math.max(p.w||0,p.d||0,p.r?p.r*2:0,42);
      const target=new T.Vector3(p.x,Math.min((p.h||1)*.48,11),p.z);
      if(close&&p.kind==='building'){
        const face=p.closeFace||(p.w>=p.d?'south':'east');
        const normals={south:[0,1],north:[0,-1],east:[1,0],west:[-1,0]},[nx,nz]=normals[face];
        target.x+=nx*p.w/2;target.z+=nz*p.d/2;
        const offset=new T.Vector3(nx*31+nz*8,11,nz*31-nx*8).multiplyScalar(portrait);
        move(target.clone().add(offset),target,1000);
      }else{
        move(target.clone().add(new T.Vector3(.65,.7,1).normalize().multiplyScalar((scale*1.55+32)*portrait)),target,1100);
      }
    }
    function top(){photoLens=false;configureLens();const aspect=host.clientWidth/host.clientHeight;const size=Math.max(campus.width/aspect,campus.depth);move(new T.Vector3(0,size*1.2/(2*Math.tan(camera.fov*Math.PI/360)),.01),new T.Vector3(),1000);}
    function north(){const distance=camera.position.distanceTo(controls.target);move(controls.target.clone().add(new T.Vector3(0,distance*.68,distance*.74)),controls.target,800);}
    function zoom(factor){const next=camera.position.clone().sub(controls.target).multiplyScalar(factor);next.setLength(T.MathUtils.clamp(next.length(),controls.minDistance,controls.maxDistance));move(controls.target.clone().add(next),controls.target,250);}
    function lighting(evening){
      scene.background.set(evening?0xe5d8c8:0xe4e8dc).convertSRGBToLinear();floor.material.color.set(evening?0xe5d8c8:0xe4e8dc).convertSRGBToLinear();
      sun.position.set(evening?-230:-180,evening?130:320,160);sun.color.set(evening?0xffca95:0xfff3d6);sun.intensity=evening?1.1:.95;
      hemisphere.intensity=evening?.45:.55;renderer.toneMappingExposure=evening?1.02:1.05;
    }
    function configureLens(){camera.fov=walker?.active?52:photoLens?Math.min(88,2*Math.atan(Math.tan(41*Math.PI/360)*(600/338)/camera.aspect)*180/Math.PI):41;camera.updateProjectionMatrix();}
    function resize(){const width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;configureLens();}
    const observer=new ResizeObserver(resize);observer.observe(host);resize();
    controls.addEventListener('start',()=>{animation=null;onManual?.();});
    let pointer;
    renderer.domElement.addEventListener('pointerdown',event=>{pointer=!walker?.active&&event.isPrimary&&event.button===0?{x:event.clientX,y:event.clientY,id:event.pointerId}:null;});
    renderer.domElement.addEventListener('pointermove',event=>{if(pointer&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>6)pointer=null;});
    renderer.domElement.addEventListener('pointercancel',()=>pointer=null);
    renderer.domElement.addEventListener('pointerup',event=>{
      if(!pointer||pointer.id!==event.pointerId)return;pointer=null;
      const rect=renderer.domElement.getBoundingClientRect(),mouse=new T.Vector2((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
      const ray=new T.Raycaster();ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(picking)[0];if(hit)onChoose(hit.object.userData.place);
    });
    const labelVector=new T.Vector3();
    function project(place){
      labelVector.set(place.x,(place.h||0)+5,place.z).project(camera);
      return{x:(labelVector.x*.5+.5)*host.clientWidth,y:(-.5*labelVector.y+.5)*host.clientHeight,visible:labelVector.z>-1&&labelVector.z<1&&Math.abs(labelVector.x)<1&&Math.abs(labelVector.y)<1};
    }
    let onFrame,lastMetrics=0;
    function render(now){
      if(!running)return;requestId=requestAnimationFrame(render);
      if(document.hidden||now-lastFrame<30)return;const dt=lastFrame?Math.min((now-lastFrame)/1000,.1):0;lastFrame=now;
      if(animation){
        const t=Math.min(1,(now-animation.start)/animation.duration),ease=t*t*(3-2*t);
        camera.position.lerpVectors(animation.from,animation.to,ease);controls.target.lerpVectors(animation.targetFrom,animation.targetTo,ease);
        if(t===1)animation=null;
      }
      if(walker?.active)walker.tick(dt);else controls.update();renderer.render(scene,camera);onFrame?.(now);
      if(now-lastMetrics>250){lastMetrics=now;renderer.domElement.dataset.walkState=JSON.stringify(walker?.state());renderer.domElement.dataset.renderStats=JSON.stringify({campus:campus.id,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures});}
    }
    requestId=requestAnimationFrame(render);
    renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();document.getElementById('error').hidden=false;document.getElementById('error-detail').textContent='图形上下文已中断，重新加载页面即可重建。';});
    return {load,choose,overview,top,north,zoom,lighting,project,resize,
      get walking(){return Boolean(walker?.active);},walkState(){return walker?.state();},
      startWalking(){animation=null;photoLens=false;walker.start();configureLens();},stopWalking(){walker?.stop();configureLens();},resetWalking(){walker?.reset();},pauseWalking(value){walker?.pause(value);},setUniform(name){uniform=name;walker?.setUniform(name);},
      get camera(){return camera;},get controls(){return controls;},get renderer(){return renderer;},get places(){return places;},set onFrame(fn){onFrame=fn;},cancel(){animation=null;},capture(){renderer.render(scene,camera);return renderer.domElement;},dispose(){running=false;cancelAnimationFrame(requestId);observer.disconnect();walker?.dispose();disposeRoot();sharedGeometry.forEach(g=>g.dispose());controls.dispose();floor.geometry.dispose();floor.material.dispose();renderer.dispose();}};
  };
})();
