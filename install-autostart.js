#!/usr/bin/env node
// 클로드 오피스 — Mac 로그인할 때 서버 자동 실행 (launchd)
//   node install-autostart.js           켜기 (지금 바로 실행도 됨)
//   node install-autostart.js --remove  끄기
//   node install-autostart.js --dry-run 무엇을 만들지 보여주기만
// ~/Library/LaunchAgents/com.claude-office.server.plist 하나만 만들고 지워요. 브라우저는 자동으로 안 열어요.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');

const LABEL = 'com.claude-office.server';
const PLIST = path.join(os.homedir(), 'Library', 'LaunchAgents', LABEL + '.plist');
const LOG = path.join(os.homedir(), 'Library', 'Logs', 'claude-office.log');
const remove = process.argv.includes('--remove'), dry = process.argv.includes('--dry-run');
const uid = process.getuid ? process.getuid() : 0;
const lc = (...a) => { try { execFileSync('launchctl', a, { stdio: 'ignore' }); return true; } catch { return false; } };

if (process.platform !== 'darwin' && !dry) { console.error('이 스크립트는 Mac 전용이에요.'); process.exit(1); }

if (remove) {
  lc('bootout', `gui/${uid}/${LABEL}`) || lc('unload', PLIST);
  if (fs.existsSync(PLIST)) fs.unlinkSync(PLIST);
  console.log('🧹 자동 실행을 껐어요. (서버도 같이 멈췄어요)');
  process.exit(0);
}

const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// launchd 는 PATH 가 짧아서 node 를 못 찾을 수 있음 → 지금 쓰는 node 의 진짜 경로를 박아 둠
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${x(process.execPath)}</string>
    <string>${x(path.join(__dirname, 'server.js'))}</string>
    <string>--no-open</string>
  </array>
  <key>WorkingDirectory</key><string>${x(__dirname)}</string>
  <key>EnvironmentVariables</key><dict><key>HOME</key><string>${x(os.homedir())}</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>ProcessType</key><string>Background</string>
  <key>LowPriorityIO</key><true/>
  <key>StandardOutPath</key><string>${x(LOG)}</string>
  <key>StandardErrorPath</key><string>${x(LOG)}</string>
</dict>
</plist>
`;
if (dry) { console.log(plist); process.exit(0); }

// 바탕화면·문서·다운로드 폴더는 Mac 보안 때문에 백그라운드 프로그램이 못 읽을 수 있음
const home = os.homedir();
const guarded = ['Desktop', 'Documents', 'Downloads'].map(d => path.join(home, d)).find(d => __dirname.startsWith(d + path.sep));
if (guarded) {
  console.log(`⚠ 이 폴더가 '${path.basename(guarded)}' 안에 있어요. Mac 보안 때문에 자동 실행된 서버가 파일을 못 읽을 수 있어요.`);
  console.log(`   추천: 폴더를 홈 바로 아래로 옮기고(예: ${path.join(home, 'claude-office')}) 거기서 다시 실행해 주세요.`);
}

fs.mkdirSync(path.dirname(PLIST), { recursive: true });
fs.mkdirSync(path.dirname(LOG), { recursive: true });
lc('bootout', `gui/${uid}/${LABEL}`) || lc('unload', PLIST); // 예전 것이 있으면 내림
fs.writeFileSync(PLIST, plist);
const ok = lc('bootstrap', `gui/${uid}`, PLIST) || lc('load', '-w', PLIST);
console.log(ok
  ? `✅ 자동 실행 켰어요! 이제 Mac 에 로그인하면 사무실이 알아서 문을 열어요.\n   지금도 켜졌어요 → http://localhost:4777\n   기록: ${LOG}\n   끄기: node install-autostart.js --remove`
  : `⚠ 설정 파일은 만들었는데 바로 켜지진 않았어요. 로그아웃 후 다시 로그인하면 켜져요. (${PLIST})`);
console.log('   폴더를 옮기면 그 자리에서 이 명령을 한 번 더 실행해 주세요.');
