#!/usr/bin/env node
// 클로드 오피스 — Antigravity 훅
// Antigravity 가 훅을 부를 때 stdin 으로 주는 JSON 을 오피스 서버(127.0.0.1)로 그대로 넘겨요.
// 사용법(설치 스크립트가 알아서 넣어 줌): node agy-hook.js <이벤트 이름>
//
// ⚠ 안전: 항상 빈 답 {} 을 내고 정상 종료해요. 그래서 Antigravity 의 동작(도구 허락·멈춤)에 아무 영향이 없어요.
//   오피스 서버가 꺼져 있어도 0.8초 안에 포기하고 넘어가요.
'use strict';
const http = require('http');

const evName = process.argv[2] || '';
const PORT = +process.env.CLAUDE_OFFICE_PORT || 4777;
let raw = '', done = false;
const finish = () => { if (done) return; done = true; process.stdout.write('{}'); process.exit(0); };
setTimeout(finish, 1500); // 무슨 일이 있어도 1.5초 안에 끝냄

process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const req = http.request({
      host: '127.0.0.1', port: PORT, method: 'POST', path: '/agy?e=' + encodeURIComponent(evName),
      headers: { 'Content-Type': 'application/json' }, timeout: 800,
    }, (res) => { res.resume(); res.on('end', finish); });
    req.on('error', finish); req.on('timeout', () => { req.destroy(); finish(); });
    req.end(raw);
  } catch { finish(); }
});
process.stdin.on('error', finish);
