#!/usr/bin/env node
// 클로드 오피스 — 츠미(Antigravity · Gemini CLI) 채용 (훅 설치)
//   node install-agy.js           설치
//   node install-agy.js --remove  제거
// Antigravity: ~/.gemini/config/hooks.json, ~/.gemini/antigravity-cli/hooks.json 에 "claude-office" 묶음 하나만 넣고 빼요.
// Gemini CLI : ~/.gemini/settings.json 의 "hooks" 안에 name 이 "claude-office" 인 것만 넣고 빼요. (다른 설정은 그대로)
// 고치기 전에 <파일>.before-claude-office 로 백업해요.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');

// 앱·IDE·CLI 공통 위치 + CLI 전용 위치 (버전에 따라 CLI 는 자기 위치만 보기도 해서 둘 다 넣음. 같은 신호가 두 번 와도 서버가 걸러냄)
const FILES = [path.join(os.homedir(), '.gemini', 'config', 'hooks.json'), path.join(os.homedir(), '.gemini', 'antigravity-cli', 'hooks.json')];
const HOOK = path.join(__dirname, 'agy-hook.js');
const KEY = 'claude-office';
// PreToolUse · Stop 은 일부러 안 써요 — 그 둘은 답(decision)에 따라 도구를 허락/거절하거나 멈춤을 막을 수 있어서.
const EVENTS = ['SessionStart', 'PreInvocation', 'PostToolUse', 'PostInvocation'];
const remove = process.argv.includes('--remove');

function apply(FILE) {
  let j = {};
  if (fs.existsSync(FILE)) {
    try { j = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
    catch (e) { console.error(`❌ ${FILE} 를 읽을 수 없어요 (JSON 형식 오류). 손대지 않고 끝낼게요.\n   ${e.message}`); return false; }
    if (!fs.existsSync(FILE + '.before-claude-office')) fs.copyFileSync(FILE, FILE + '.before-claude-office');
  } else if (remove) return null;

  if (remove) delete j[KEY];
  else {
    // Mac 앱(Antigravity)은 터미널과 PATH 가 달라서 'node' 를 못 찾을 수 있음 → 지금 쓰는 node 의 진짜 경로를 박아 둠
    const cmd = `"${process.execPath}" "${HOOK}"`;
    // 공식 문서 형식: 도구 훅(PostToolUse)은 { matcher, hooks: [명령] }, 나머지 훅은 [명령] 을 바로 적음
    j[KEY] = { enabled: true };
    for (const e of EVENTS) {
      const h = { type: 'command', command: `${cmd} ${e}`, timeout: 5 };
      j[KEY][e] = e === 'PostToolUse' ? [{ matcher: '.*', hooks: [h] }] : [h];
    }
  }
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(j, null, 2) + '\n');
  return true;
}
const results = FILES.map(f => [f, apply(f)]);

// ── Gemini CLI ──  안전한(막거나 바꿀 수 없는/빈 답이면 그대로인) 훅만: 시작 · 질문 받음 · 도구 끝 · 답 끝 · 허락 요청 알림
const GEM_FILE = path.join(os.homedir(), '.gemini', 'settings.json');
const GEM_EVENTS = ['SessionStart', 'BeforeAgent', 'AfterTool', 'AfterAgent', 'Notification'];
const ours = (h) => h && (h.name === KEY || String(h.command || '').includes(HOOK));
function applyGemini() {
  if (!fs.existsSync(path.dirname(GEM_FILE))) return null; // Gemini CLI 를 한 번도 안 켰음
  let j = {};
  if (fs.existsSync(GEM_FILE)) {
    try { j = JSON.parse(fs.readFileSync(GEM_FILE, 'utf8')); }
    catch (e) { console.error(`❌ ${GEM_FILE} 를 읽을 수 없어요 (주석이 있거나 형식 오류). 손대지 않을게요.\n   ${e.message}`); return false; }
    if (!fs.existsSync(GEM_FILE + '.before-claude-office')) fs.copyFileSync(GEM_FILE, GEM_FILE + '.before-claude-office');
  } else if (remove) return null;
  const H = j.hooks = (j.hooks && typeof j.hooks === 'object') ? j.hooks : {};
  for (const e of Object.keys(H)) { // 예전에 넣은 우리 것 빼기
    if (!Array.isArray(H[e])) continue;
    H[e] = H[e].map(g => g && Array.isArray(g.hooks) ? Object.assign({}, g, { hooks: g.hooks.filter(h => !ours(h)) }) : g).filter(g => !g || !Array.isArray(g.hooks) || g.hooks.length);
    if (!H[e].length) delete H[e];
  }
  if (!remove) {
    for (const e of GEM_EVENTS) {
      const h = { name: KEY, type: 'command', command: `"${process.execPath}" "${HOOK}" ${e} gemini`, timeout: 5000, description: '클로드 오피스에 츠미 출근 신호 (읽기 전용)' };
      (H[e] = H[e] || []).push(e === 'AfterTool' ? { matcher: '.*', hooks: [h] } : { hooks: [h] });
    }
  }
  if (!Object.keys(H).length) delete j.hooks;
  fs.writeFileSync(GEM_FILE, JSON.stringify(j, null, 2) + '\n');
  return true;
}
results.push([GEM_FILE + ' (Gemini CLI)', applyGemini()]);
if (!remove) console.log(`   node 경로: ${process.execPath}  (Node 를 새로 깔거나 폴더를 옮기면 이 명령을 다시 실행해 주세요)\n   훅이 불렸는지 확인: ${path.join(__dirname, 'agy-hook.log')}`);
for (const [f, r] of results) console.log(r === null ? `   (없음) ${f}` : r ? `   ${remove ? '🧹 뺐어요' : '✅ 넣었어요'}: ${f}` : `   ❌ 못 고쳤어요: ${f}`);
if (!remove) console.log('✅ 츠미 채용 완료! Antigravity(앱·agy)와 gemini 를 껐다 켜면 반영돼요. 오피스 서버가 켜져 있어야 출근해요.\n   확인: Antigravity 앱은 Settings > Customizations > Hooks, agy 는 /hooks, gemini 는 /hooks panel 에서 claude-office 가 보이면 성공');
