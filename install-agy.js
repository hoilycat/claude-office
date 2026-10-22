#!/usr/bin/env node
// 클로드 오피스 — Antigravity 직원 채용 (훅 설치)
//   node install-agy.js           설치
//   node install-agy.js --remove  제거
// ~/.gemini/config/hooks.json (Antigravity 앱·IDE·CLI 공통 전역 훅 파일) 에 "claude-office" 묶음 하나만 넣고 빼요.
// 다른 훅은 건드리지 않고, 고치기 전에 hooks.json.before-claude-office 로 백업해요.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');

const FILE = path.join(os.homedir(), '.gemini', 'config', 'hooks.json');
const HOOK = path.join(__dirname, 'agy-hook.js');
const KEY = 'claude-office';
// PreToolUse · Stop 은 일부러 안 써요 — 그 둘은 답(decision)에 따라 도구를 허락/거절하거나 멈춤을 막을 수 있어서.
const EVENTS = ['SessionStart', 'PreInvocation', 'PostToolUse', 'PostInvocation'];
const remove = process.argv.includes('--remove');

let j = {};
if (fs.existsSync(FILE)) {
  try { j = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch (e) { console.error(`❌ ${FILE} 를 읽을 수 없어요 (JSON 형식 오류). 손대지 않고 끝낼게요.\n   ${e.message}`); process.exit(1); }
  if (!fs.existsSync(FILE + '.before-claude-office')) fs.copyFileSync(FILE, FILE + '.before-claude-office');
} else if (remove) { console.log('설치된 게 없어요.'); process.exit(0); }

if (remove) delete j[KEY];
else {
  const cmd = `node "${HOOK}"`;
  j[KEY] = {};
  for (const e of EVENTS) {
    const h = { type: 'command', command: `${cmd} ${e}`, timeout: 5 };
    j[KEY][e] = [e === 'PostToolUse' ? { matcher: '.*', hooks: [h] } : { hooks: [h] }];
  }
}
fs.mkdirSync(path.dirname(FILE), { recursive: true });
fs.writeFileSync(FILE, JSON.stringify(j, null, 2) + '\n');
console.log(remove ? `🧹 Antigravity 훅을 뺐어요 (${FILE})`
  : `✅ Antigravity 직원 채용 완료! (${FILE})\n   Antigravity 를 껐다 켜면 반영돼요. 오피스 서버(node server.js)가 켜져 있어야 출근해요.`);
