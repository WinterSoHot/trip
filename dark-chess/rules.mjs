export const NAMES = {red:['兵','炮','马','车','相','仕','帅'],black:['卒','炮','马','车','象','士','将']};
const STOCK = [5,2,2,2,2,2,1];
const other = color => color === 'red' ? 'black' : 'red';
const indexOK = i => Number.isInteger(i) && i >= 0 && i < 32;
export const pieceName = p => `${p.color === 'red' ? '红' : '黑'}${NAMES[p.color][p.rank]}`;
export function positionKey(s) {
  return `${s.turn}/${s.colors.join(',')}/${s.board.map(p => !p ? '.' : !p.face ? '?' : `${p.color[0]}${p.rank}`).join(',')}`;
}
export function createGame(random = Math.random) {
  const board=[];
  for (const color of ['red','black']) STOCK.forEach((count,rank) => {
    for (let i=0;i<count;i++) board.push({color,rank,face:false});
  });
  for (let i=31;i>0;i--) { const j=Math.floor(random()*(i+1)); [board[i],board[j]]=[board[j],board[i]]; }
  const s={board,colors:[null,null],turn:0,ply:0,quiet:0,result:null,positions:{},last:''};
  s.positions[positionKey(s)]=1;
  return s;
}
function canMove(s,from,to) {
  if (!indexOK(from)||!indexOK(to)||from===to) return false;
  const p=s.board[from], q=s.board[to];
  if (!p?.face || p.color!==s.colors[s.turn] || (q && (!q.face||q.color===p.color))) return false;
  const fr=Math.floor(from/4), fc=from%4, tr=Math.floor(to/4), tc=to%4;
  const adjacent=Math.abs(fr-tr)+Math.abs(fc-tc)===1;
  if (!q) return adjacent;
  if (p.rank===1) {
    if (fr!==tr && fc!==tc) return false;
    const step=fr===tr?(to>from?1:-1):(to>from?4:-4);
    let screens=0;
    for (let i=from+step;i!==to;i+=step) if (s.board[i]) screens++;
    return screens===1;
  }
  if (!adjacent) return false;
  if (p.rank===0) return q.rank===0||q.rank===6;
  if (p.rank===6 && q.rank===0) return false;
  return p.rank>=q.rank;
}
export function legalTargets(s,from) {
  if (s.result) return [];
  return Array.from({length:32},(_,i)=>i).filter(to=>canMove(s,from,to));
}
function finish(s) {
  const color=s.colors[s.turn];
  if (!s.board.some(p=>p?.color===color)) s.result={winner:1-s.turn,reason:'elimination'};
  else if (!s.board.some(p=>p&&!p.face) && !s.board.some((p,i)=>p?.color===color&&legalTargets(s,i).length)) s.result={winner:1-s.turn,reason:'stuck'};
  else if (s.positions[positionKey(s)]>=3) s.result={winner:null,reason:'repetition'};
  else if (s.quiet>=60) s.result={winner:null,reason:'quiet'};
}
export function play(state,action) {
  if (state.result || !action) return null;
  const {type,index,from,to}=action;
  if (type==='flip') {
    if (!indexOK(index)||!state.board[index]||state.board[index].face) return null;
  } else if (type==='move') {
    if (!canMove(state,from,to)) return null;
  } else return null;
  const s=structuredClone(state);
  let irreversible=type==='flip';
  if (type==='flip') {
    s.board[index].face=true;
    if (!s.colors[0]) s.colors=[s.board[index].color,other(s.board[index].color)];
    s.last=`玩家 ${s.turn+1} 翻开${pieceName(s.board[index])}`;
  } else {
    const p=s.board[from], target=s.board[to];
    irreversible=!!target;
    s.last=`玩家 ${s.turn+1} ${pieceName(p)}${target?`吃掉${pieceName(target)}`:'移动一格'}`;
    s.board[to]=p; s.board[from]=null;
  }
  s.quiet=irreversible?0:s.quiet+1;
  s.turn=1-s.turn; s.ply++;
  if (irreversible) s.positions={};
  const key=positionKey(s); s.positions[key]=(s.positions[key]||0)+1;
  finish(s);
  return s;
}
export function resign(state) {
  if (state.result) return state;
  const s=structuredClone(state);
  s.result={winner:1-s.turn,reason:'resign'};
  s.last=`玩家 ${s.turn+1} 认输`;
  return s;
}
export function validateState(s) {
  if (!s || typeof s!=='object' || !Array.isArray(s.board)||s.board.length!==32 || !Array.isArray(s.colors)||s.colors.length!==2) return false;
  if (!Number.isInteger(s.turn)||s.turn<0||s.turn>1 || !Number.isInteger(s.ply)||s.ply<0||s.ply>10000 || !Number.isInteger(s.quiet)||s.quiet<0||s.quiet>60) return false;
  if (typeof s.last!=='string'||s.last.length>160 || !s.positions||typeof s.positions!=='object'||Array.isArray(s.positions)) return false;
  const positions=Object.entries(s.positions);
  if (positions.length>64 || positions.some(([k,v])=>k.length>200||!Number.isInteger(v)||v<1||v>3)) return false;
  const counts={red:Array(7).fill(0),black:Array(7).fill(0)};
  for (const p of s.board) {
    if (p===null) continue;
    if (!p||!['red','black'].includes(p.color)||!Number.isInteger(p.rank)||p.rank<0||p.rank>6||typeof p.face!=='boolean') return false;
    if (++counts[p.color][p.rank]>STOCK[p.rank]) return false;
  }
  const unassigned=s.colors.every(c=>c===null);
  if (unassigned) {
    if (s.ply!==0 || s.turn!==0 || s.quiet!==0 || s.board.some(p=>!p||p.face)) return false;
  } else if (!['red','black'].includes(s.colors[0])||s.colors[1]!==other(s.colors[0])||s.ply===0||!s.board.some(p=>p?.face)) return false;
  if (s.result!==null && (!s.result||![null,0,1].includes(s.result.winner)||!['elimination','stuck','quiet','repetition','resign'].includes(s.result.reason))) return false;
  return true;
}
