import ares from '../assets/characters/ares.jpg'
import cyclops from '../assets/characters/cyclops.jpg'
import genie from '../assets/characters/genie.jpg'
import hercules from '../assets/characters/hercules.jpg'
import hermes from '../assets/characters/hermes.jpg'
import medusa from '../assets/characters/medusa.jpg'
import poseidon from '../assets/characters/poseidon.jpg'
import siren from '../assets/characters/siren.jpg'

// Names from the team, in the order of their character images (1~8); nicknames from the design.
// Characters are cosmetic, so no stats or abilities are listed. Image files keep their original myth names.
export const CHARACTERS = [
  { name: '아로', nickname: '강인한 파워 패들러', image: hercules },
  { name: '오키', nickname: '묵직한 조타수', image: cyclops },
  { name: '폴리', nickname: '순풍을 부르는 마법사', image: genie },
  { name: '트리티', nickname: '파도를 다스리는 인어', image: siren },
  { name: '페피', nickname: '재빠른 급류 탐험가', image: medusa },
  { name: '포돈', nickname: '바다의 지배자', image: poseidon },
  { name: '피기', nickname: '불꽃 돌격 멧돼지 캡틴', image: ares },
  { name: '헤미', nickname: '날개 달린 고속 질주자', image: hermes },
] as const
