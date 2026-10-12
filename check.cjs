const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const contextStub=new Proxy({}, {get:(o,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
const nodes=new Map();
function node(){const listeners={};return{listeners,hidden:true,textContent:'',value:'',dataset:{},isConnected:true,tagName:'BUTTON',classList:{toggle(){}},setAttribute(){},getContext(){return contextStub},addEventListener(type,fn){(listeners[type]||=[]).push(fn)},setPointerCapture(id){this.capturedPointer=id},querySelector(){return null},querySelectorAll(){return[]},replaceChildren(){},append(){},focus(){},style:{}}}
let randomState=20261011;const seededMath=Object.create(Math);seededMath.random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296};
const docEvents={},windowEvents={};
const store={};const sandbox={console,Math:seededMath,JSON,Number,Set,Array,String,Object,performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame(){},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},document:{getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll:()=>[],createElement:node,addEventListener(type,fn){(docEvents[type]||=[]).push(fn)},body:node(),documentElement:{lang:'uk'},hidden:false},window:{addEventListener(type,fn){(windowEvents[type]||=[]).push(fn)}}};vm.createContext(sandbox);vm.runInContext(script,sandbox);
const run=code=>vm.runInContext(code,sandbox);let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name)}
run(`function startTestRun(){startRun();courseSeed=7654321;player.y=player.arcY=terrain(player.x)}
function followCourse(seconds){for(let i=0;i<120*seconds;i++){
  const cue=entities.filter(e=>(e.type==='marker'||e.type==='ramp')&&!e.used&&e.x-world-player.x>-speed/60).sort((a,b)=>a.x-b.x)[0];
  if(player.grounded)endJumpInput('test');
  if(cue&&cue.type==='marker'&&player.grounded&&cue.x-world-player.x<=speed/120){cue.used=true;beginJumpInput('test')}
  update(1/120);if(mode!=='playing')break;
}}`);
test('fresh save has no unearned items or money',()=>{assert.equal(run('save.ready'),false);assert.equal(run('save.coins'),0);assert.equal(run('save.ownedRiders.length+save.ownedGear.length'),0)});
test('all languages contain the same keys',()=>{assert.equal(run('Object.keys(I18N.uk).filter(k=>k!=="fullscreen").every(k=>typeof I18N.pl[k]==="string"&&typeof I18N.en[k]==="string")'),true)});
test('invalid saved selections and values are repaired',()=>{assert.equal(run('cleanSave({lang:"xx",coins:-50,volume:9,ownedRiders:["alien"],ownedGear:[]}).coins'),0);assert.equal(run('cleanSave({lang:"xx",volume:9}).volume'),1);assert.equal(run('cleanSave({ready:true}).ready'),false)});
test('first setup awards exactly one rider and one board',()=>{run('choiceGender="female";choiceGear="board";$("start-adventure").onclick()');assert.equal(run('save.rider'),'female');assert.equal(run('save.gear'),'board-classic');assert.equal(run('save.ownedRiders.length'),1);assert.equal(run('save.ownedGear.length'),1);assert.equal(run('mode'),'playing')});
test('setup cannot award another free set',()=>{run('choiceGender="male";choiceGear="ski";$("start-adventure").onclick()');assert.equal(run('save.rider'),'female');assert.equal(run('save.ownedRiders.length'),1)});
test('jump rises and lands with fixed-step physics',()=>{run('startTestRun();requestJump();for(let i=0;i<30;i++)update(1/120)');assert.equal(run('player.grounded'),false);assert.ok(run('terrain(world+player.x)-player.y')>12);run('for(let i=0;i<120;i++)update(1/120)');assert.equal(run('player.grounded'),true)});
test('coins increase the run total',()=>{run('startTestRun();entities=[{type:"coin",x:world+player.x,height:12}];update(1/120)');assert.equal(run('runCoins'),1);assert.equal(run('entities.some(e=>e.type==="coin"&&e.taken)'),false)});
test('rock collision ends run and banks earnings only once',()=>{run('startTestRun();runCoins=7;score=90;world=900;player.y=terrain(world+player.x);entities=[{type:"rock",x:world+player.x}];update(1/120)');assert.equal(run('mode'),'crashed');assert.equal(run('save.coins'),7);run('saveRun();saveRun()');assert.equal(run('save.coins'),7);assert.ok(run('save.best')>=90);run('update(.8)');assert.equal(run('mode'),'gameover')});
test('airborne rider clears collision box',()=>{run('startTestRun();player.grounded=false;player.y=terrain(world+player.x)-60;player.arcY=terrain(world+player.x)-120;player.vy=0;entities=[{type:"rider",x:world+player.x,rider:0}];update(1/120)');assert.equal(run('mode'),'playing')});
test('ramps launch automatically',()=>{run('startTestRun();entities=[{type:"ramp",x:world+player.x,used:false}];update(1/120)');assert.equal(run('player.grounded'),false);assert.ok(run('player.vy')< -200)});
test('pause stops score and movement',()=>{run('startTestRun();update(.1);pauseRun()');const before=run('world');run('for(let i=0;i<300;i++)update(1/120)');assert.equal(run('world'),before);assert.equal(run('mode'),'paused');run('resumeRun();update(.1)');assert.ok(run('world')>before)});
test('speed increases by exactly 0.1x at each 100-point boundary',()=>{for(const [points,multiple] of [[0,1],[99.99,1],[100,1.1],[199.99,1.1],[200,1.2],[1000,2],[3000,4],[10000,11]]){assert.ok(Math.abs(run('speedForScore('+points+')')-78*multiple)<1e-9)}run('startTestRun();entities=[];spawnAt=1e9;world=999.8;score=world/10;update(1/120)');assert.equal(nodes.get('speed').textContent,'1.1×')});
test('purchases are affordable, persisted, and not charged twice',()=>{run('save.coins=99');assert.equal(run('purchase("ski-classic","gear")'),false);assert.equal(run('save.coins'),99);run('save.coins=200;purchase("ski-classic","gear")');assert.equal(run('save.coins'),100);assert.equal(run('save.gear'),'ski-classic');run('purchase("ski-classic","gear")');assert.equal(run('save.coins'),100);assert.ok(JSON.parse(store['ski-to-inifinite-v1']).ownedGear.includes('ski-classic'))});
test('returning to menu saves coins without death',()=>{run('startTestRun();runCoins=4;pauseRun();goMenu()');assert.equal(run('save.coins'),104);assert.equal(run('mode'),'menu')});
test('generated courses remain playable and reward well-timed jumps',()=>{
  for(const offset of [0,10000,30000,90000])for(const seed of [1,17,934567]){
    run(`startTestRun();courseSeed=${seed};world=${offset};score=world/10;speed=speedForScore(score);spawnAt=world+player.x+speed*2;entities=[];player.y=player.arcY=terrain(world+player.x);followCourse(65)`);
    assert.equal(run('mode'),'playing',JSON.stringify({offset,seed,world:run('world'),near:run('entities.filter(e=>Math.abs(e.x-world-player.x)<50)')}));
    assert.ok(run('runCoins')>20);
  }
});
function trajectory(hold){return run(`(()=>{startTestRun();entities=[];spawnAt=1e9;const from=player.y;let peak=0,time=0;beginJumpInput('test');for(let i=0;i<480;i++){if(i/120>=${hold})endJumpInput('test');update(1/120);time+=1/120;peak=Math.max(peak,from-player.y);if(i>0&&player.grounded)break}return{peak,time}})()`)}
test('longer holds produce progressively higher and longer jumps',()=>{const arcs=[0,.1,.2,.32].map(trajectory);for(let i=1;i<arcs.length;i++){assert.ok(arcs[i].peak>arcs[i-1].peak+2);assert.ok(arcs[i].time>arcs[i-1].time+.05)}assert.ok(arcs[3].peak>arcs[0].peak*1.6);console.log('  tap / full hold:',JSON.stringify([arcs[0],arcs[3]]))});
test('holding has a cap and cannot cause infinite flight',()=>{const capped=trajectory(.33),long=trajectory(5);assert.equal(long.peak,capped.peak);assert.equal(long.time,capped.time);assert.ok(long.time<2)});
test('holding through landing never jumps repeatedly',()=>{run('startTestRun();entities=[];spawnAt=1e9;beginJumpInput("key:Space");for(let i=0;i<360;i++)update(1/120)');assert.equal(run('player.grounded'),true);assert.equal(run('jumpBuffer'),0)});
test('releasing then pressing in midair cannot restart lift',()=>{run('startTestRun();entities=[];spawnAt=1e9;beginJumpInput("key:Space");for(let i=0;i<18;i++)update(1/120);endJumpInput("key:Space");beginJumpInput("key:Space")');const held=run('player.holdTime');run('for(let i=0;i<12;i++)update(1/120)');assert.equal(run('player.holdTime'),held);assert.equal(run('player.holdActive'),false)});
test('held jump clears a moving rider with the lower arc',()=>{run('startTestRun();entities=[{type:"rider",rider:0,x:player.x+44}];spawnAt=1e9;beginJumpInput("key:Space");for(let i=0;i<190;i++)update(1/120)');assert.equal(run('mode'),'playing');assert.ok(run('entities[0].x-world-player.x') < -25)});
test('keyboard press and release use the real event handlers',()=>{run('startTestRun();entities=[];spawnAt=1e9');const event={code:'Space',target:{tagName:'CANVAS'},preventDefault(){},repeat:false};docEvents.keydown.forEach(fn=>fn(event));run('update(1/120)');assert.equal(run('player.holdActive'),true);docEvents.keyup.forEach(fn=>fn(event));assert.equal(run('jumpInputs.size'),0);assert.equal(run('player.holdActive'),false)});
test('pointer capture and cancellation release a held touch',()=>{run('startRun()');const target=nodes.get('jump');target.listeners.pointerdown.forEach(fn=>fn({button:0,pointerId:7,preventDefault(){}}));assert.equal(target.capturedPointer,7);run('update(1/120)');assert.equal(run('player.holdActive'),true);docEvents.pointercancel.forEach(fn=>fn({pointerId:7}));assert.equal(run('jumpInputs.size'),0);assert.equal(run('player.holdActive'),false)});
test('separate input releases preserve another active hold',()=>{run('startTestRun();beginJumpInput("key:Space");beginJumpInput("pointer:3");update(1/120);endJumpInput("pointer:3")');assert.equal(run('player.holdActive'),true);run('endJumpInput("key:Space")');assert.equal(run('player.holdActive'),false)});
test('pause and lost focus clear inputs before resuming',()=>{run('startTestRun();beginJumpInput("key:Space");update(1/120)');windowEvents.blur.forEach(fn=>fn());assert.equal(run('mode'),'paused');assert.equal(run('jumpInputs.size'),0);run('resumeRun()');assert.equal(run('player.holdActive'),false)});
test('coin chime has lower volume, pitch, soft attacks and a cooldown',()=>{const calls=[];sandbox.captureTone=(...args)=>calls.push(args);run('var originalTone=tone;var originalAudio=audio;tone=captureTone;audio={currentTime:10};lastCoinSound=-Infinity;sfx("coin");sfx("coin")');assert.equal(calls.length,2);assert.ok(calls.every(([freq,duration,type,level,delay,attack])=>freq<700&&type==='sine'&&level<=.11&&attack>=.025));run('audio.currentTime+=.1;sfx("coin")');assert.equal(calls.length,4);run('tone=originalTone;audio=originalAudio')});

test('collisions use the visible lower arc',()=>{
  run('startTestRun();entities=[];spawnAt=1e9;beginJumpInput("test");update(1/120);player.arcY=terrain(world+player.x)-40;player.vy=0;entities=[{type:"rider",rider:0,x:world+player.x}];update(1/120)');
  assert.equal(run('mode'),'crashed');
});


test('every restart creates a new stable terrain and obstacle layout',()=>{
  const tracks=[];for(let i=0;i<12;i++)tracks.push(run(`(()=>{startRun();const heights=Array.from({length:15},(_,j)=>terrain(j*83));entities=[];const groups=Array.from({length:4},()=>spawnGroup()).map(g=>[g.takeoff,g.obstacle.type,g.ramp]);return JSON.stringify({seed:courseSeed,heights,groups})})()`));
  assert.equal(new Set(tracks).size,tracks.length);
  assert.equal(run('terrain(1234)'),run('terrain(1234)'));
  for(let x=0;x<5000;x+=7){assert.ok(run('terrain('+x+')')>=183&&run('terrain('+x+')')<=227);assert.ok(Math.abs(run('slope('+x+')'))<.4)}
});
test('a correctly timed held jump collects every airborne coin across speeds and hills',()=>{
  let ramps=0,riders=0,crossings=0;
  for(const offset of [0,850,1900,9800,29800,90000])for(let seed=1;seed<=16;seed++){
    const result=run(`(()=>{startTestRun();courseSeed=${seed};world=${offset};score=world/10;speed=speedForScore(score);entities=[];spawnAt=world+player.x+speed*.8;player.y=player.arcY=terrain(world+player.x);const group=spawnGroup();spawnAt=1e12;const oldSpeed=speed;followCourse(3.5);return {mode,got:runCoins,total:group.coins.length,ramp:group.ramp,rider:group.obstacle.type==='rider',crossed:speed!==oldSpeed}})()`);
    assert.equal(result.mode,'playing',JSON.stringify({offset,seed,result}));
    assert.equal(result.got,result.total,JSON.stringify({offset,seed,result}));
    if(result.ramp)ramps++;if(result.rider)riders++;if(result.crossed)crossings++;
  }
  assert.ok(ramps>5&&riders>5&&crossings>5);
  console.log('  complete coin trails: 96; ramps:',ramps,'riders:',riders,'speed transitions:',crossings);
});
test('low jump height remains unchanged on a flat slope',()=>{
  run('var realTerrain=terrain;terrain=()=>205');
  try{const full=trajectory(.32);assert.ok(full.peak>43&&full.peak<48);assert.ok(full.time>1.3&&full.time<1.45)}finally{run('terrain=realTerrain')}
});

console.log(`${passed} meaningful game checks passed.`);
