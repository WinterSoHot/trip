import {createGame,play,legalTargets,validateState,resign,pieceName} from './rules.mjs';
const $ = id => document.getElementById(id);
const board=$('board');
const SAVE_KEY='trip-dark-chess:1';
const wide=matchMedia('(min-width:680px), (orientation:landscape) and (min-width:520px)');
let selected=null, lastTarget=null, pending=null, lastActionAt=0, savedMessage='局面自动保存在此浏览器';
let state=load();
function load() {
  let raw;
  try {raw=localStorage.getItem(SAVE_KEY);}
  catch {
    savedMessage='无法读取上次存档，已开始新局';
    return createGame();
  }
  if (raw) {
    let saved;
    try {saved=raw.length<50000?JSON.parse(raw):null;} catch {saved=null;}
    if (saved?.version===1&&validateState(saved.state)) {
      savedMessage='已恢复上次对局 · 局面自动保存';
      return saved.state;
    }
    savedMessage='存档已失效，已开始新局';
  }
  return createGame();
}
function save() {
  try {localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,state}));}
  catch {savedMessage='本次局面无法保存；当前页面仍可继续玩';}
  $('save-note').textContent=savedMessage;
}
function order() {
  return Array.from({length:32},(_,v)=>wide.matches?(7-v%8)*4+Math.floor(v/8):v);
}
function render() {
  const focusIndex=board.contains(document.activeElement)?Number(document.activeElement.dataset.index):null;
  const targets=selected===null?[]:legalTargets(state,selected);
  const indices=order(), cols=wide.matches?8:4;
  const cells=indices.map((index,v)=>{
    const p=state.board[index], cell=document.createElement('button');
    cell.type='button'; cell.className='cell'; cell.dataset.index=index;
    const at=`第 ${Math.floor(v/cols)+1} 行第 ${v%cols+1} 列`;
    let label=p?(p.face?pieceName(p):'未翻开'):'空位';
    if (p) {
      const disc=document.createElement('span'); disc.className='piece'; disc.setAttribute('aria-hidden','true');
      if (p.face) {disc.textContent=pieceName(p).slice(1); cell.classList.add(p.color);}
      else {const back=document.createElement('span');back.className='piece-back';disc.append(back);cell.classList.add('hidden-piece');}
      cell.append(disc);
    }
    if (index===selected) {cell.classList.add('selected');label+='，已选中';}
    if (targets.includes(index)) {cell.classList.add(p?'can-capture':'can-move');label+=p?'，可以吃':'，可以走';}
    if (index===lastTarget) cell.classList.add('last-target');
    cell.setAttribute('aria-label',`${at}，${label}`);
    cell.setAttribute('aria-pressed',String(index===selected));
    cell.disabled=!!state.result;
    return cell;
  });
  board.replaceChildren(...cells);
  for (let i=0;i<2;i++) {
    const el=$(`player-${i}`), color=state.colors[i];
    el.className=`player${color?' '+color:''}${!state.result&&state.turn===i?' active':''}`;
    el.querySelector('.side-label').textContent=color?(color==='red'?'红方':'黑方'):'待分色';
    el.querySelector('.piece-count').textContent=color?`剩余 ${state.board.filter(p=>p?.color===color).length} 子`:i===0?'先翻棋':'等待翻棋';
    el.querySelector('.turn-tag').textContent=state.result?(state.result.winner===i?'获胜':''):state.turn===i?'轮到你':'';
  }
  $('summary').textContent=state.result?resultText():state.colors[0]?`轮到玩家 ${state.turn+1} · ${state.colors[state.turn]==='red'?'红方':'黑方'}`:'玩家 1 先翻棋';
  $('move-count').textContent=`第 ${state.ply} 手`;
  $('last-action').textContent=state.last||'红黑各 16 子';
  $('instruction').textContent=state.result?'这局结束了，再来一局吧。':selected!==null?(targets.length?'点蓝色标记走棋或吃子；也可翻一枚暗子。':'这枚棋暂时走不了，可换选或翻棋。'):state.colors[0]?'点击暗子翻棋，或选自己的明子。':'点击暗子翻棋，首次翻棋决定颜色。';
  $('resign-button').disabled=!!state.result||!state.colors[0];
  $('new-game').disabled=false;
  if (focusIndex!==null&&!state.result) board.querySelector(`[data-index="${focusIndex}"]`)?.focus({preventScroll:true});
  $('save-note').textContent=savedMessage;
}
function resultText() {
  const reasons={elimination:'对手棋子已吃完',stuck:'对手无合法操作',resign:'对手认输',quiet:'连续 60 手未翻棋、未吃子',repetition:'相同局面出现三次'};
  return `${state.result.winner===null?'和棋':`玩家 ${state.result.winner+1} 获胜`} · ${reasons[state.result.reason]}`;
}
function commit(next,target=null) {
  state=next;selected=null;lastTarget=target;lastActionAt=Date.now();save();render();
  if (state.result) $('summary').focus({preventScroll:true});
}
board.addEventListener('click',event=>{
  const cell=event.target.closest('.cell');
  if (!cell||state.result||Date.now()-lastActionAt<220) return;
  const index=Number(cell.dataset.index), p=state.board[index];
  if (p&&!p.face) {const next=play(state,{type:'flip',index});if(next)commit(next,index);return;}
  if (selected!==null) {
    const next=play(state,{type:'move',from:selected,to:index});
    if (next) {commit(next,index);return;}
  }
  if (p?.face&&p.color===state.colors[state.turn]) {selected=selected===index?null:index;render();}
  else if (selected===null) $('instruction').textContent=p?'这是对方的棋，请选择自己的明子。':'请先选一枚自己的明子。';
  else $('instruction').textContent='这里不能走，请点蓝色标记或翻棋。';
});
board.addEventListener('keydown',event=>{
  const cell=event.target.closest('.cell');if(!cell)return;
  const indices=order(), at=indices.indexOf(Number(cell.dataset.index)),cols=wide.matches?8:4;
  const steps={ArrowUp:-cols,ArrowDown:cols,ArrowLeft:-1,ArrowRight:1};
  if (!(event.key in steps))return;
  event.preventDefault();const next=at+steps[event.key];
  if (next<0||next>=32||event.key==='ArrowLeft'&&at%cols===0||event.key==='ArrowRight'&&at%cols===cols-1)return;
  board.querySelector(`[data-index="${indices[next]}"]`)?.focus();
});
function confirmAction(kind) {
  pending=kind;
  $('confirm-title').textContent=kind==='new'?'重新开始？':`玩家 ${state.turn+1} 确认认输？`;
  $('confirm-description').textContent=kind==='new'?'当前对局将结束，棋子重新洗牌。':'确认后，本局由对方获胜。';
  $('accept-confirm').textContent=kind==='new'?'开始新局':'确认认输';
  $('confirm-dialog').showModal();$('cancel-confirm').focus();
}
$('new-game').addEventListener('click',()=>confirmAction('new'));
$('resign-button').addEventListener('click',()=>confirmAction('resign'));
$('cancel-confirm').addEventListener('click',()=>$('confirm-dialog').close());
$('confirm-dialog').addEventListener('close',()=>{pending=null;});
$('accept-confirm').addEventListener('click',()=>{
  const action=pending;pending=null;$('confirm-dialog').close();
  if (action==='new') {savedMessage='局面自动保存在此浏览器';commit(createGame());}
  if (action==='resign') commit(resign(state));
});
$('rules-button').addEventListener('click',()=>$('rules-dialog').showModal());
wide.addEventListener('change',render);
render();save();
