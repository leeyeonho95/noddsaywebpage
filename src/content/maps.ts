import desert from '../assets/maps/desert.webp'
import river from '../assets/maps/river.webp'
import { OBSTACLES } from './obstacles'

// Map names and descriptions from the team; one sentence per line. Images are the team's map art, resized to 1280x720.
// label and icon are for the switch; icons must also be listed in index.html's Material Symbols icon_names.
// Both maps ship in the first release (team decision 2026-11-05).
export const MAPS = [
  {
    label: '강',
    icon: 'waves',
    difficulty: '★',
    name: '포세이돈의 물장난',
    lines: ['포세이돈이 삼지창은 숨겨 놓고 노 두 개만 내어준 물길', '어떻게든 집으로 가자!'],
    image: river,
    alt: '폭포가 쏟아지는 열대 강 위의 뗏목과 노 두 개',
    obstacles: [OBSTACLES.log, OBSTACLES.crocodile],
  },
  {
    label: '사막',
    icon: 'sunny',
    difficulty: '★★',
    name: '헬리오스의 모래시계',
    lines: ['헬리오스는 퇴근했는데 모래는 아직 식지 않은 태양의 유배지', '사막에서 잠들 순 없지!'],
    image: desert,
    alt: '스핑크스와 피라미드 앞 사막 오아시스',
    obstacles: [OBSTACLES.sphinx],
  },
] as const
