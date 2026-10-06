import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deploymentIdentity } from './deployment-identity.mjs';
const root = resolve(import.meta.dirname, '..');
const config = JSON.parse(await readFile(resolve(root, 'aleph.config.json'), 'utf8'));
if (![2, 3, 4].includes(config.step)) throw new Error('자료 API 단계 설정을 확인하세요.');
await mkdir(resolve(root, 'public'), { recursive: true });
await writeFile(resolve(root, 'public/data.json'), '{ "notes": [] }\n');
if (!process.argv.includes('--local')) {
  const identity = deploymentIdentity(process.env, config);
  await writeFile(resolve(root, 'public/aleph.json'), JSON.stringify(identity, null, 2) + '\n');
}
console.log('공개 자료는 0건입니다. 화면은 서버 API에서 읽습니다.');
