import crocodile from '../assets/obstacles/crocodile.webp'
import log from '../assets/obstacles/log.webp'
import sphinx from '../assets/obstacles/sphinx.webp'

// Obstacle art from the team (transparent, trimmed and resized; the sphinx's flat background was removed).
// The escape motions follow the game design (docs/planning/game-design-v1.md, 코스와 장애물): duck under the low log,
// clap like a crocodile's jaws. The sphinx rule is from the team (an O/X question, 5 seconds frozen on a miss); how
// players answer is not decided, so it has no motion. Each map lists its own obstacles in content/maps.ts.
export const OBSTACLES = {
  log: {
    name: '통나무',
    image: log,
    width: 640,
    height: 95,
    motion: '숙이기',
    lines: ['낮은 통나무가 물길을 가로막아요', '두 사람이 모두 몸을 숙여야 빠져나갈 수 있어요'],
  },
  crocodile: {
    name: '악어',
    image: crocodile,
    width: 509,
    height: 360,
    motion: '악어 박수',
    lines: ['악어가 나타나 배를 붙잡아요', '두 팔을 벌렸다가 박수를 치는 악어 박수로 빠져나가요'],
  },
  sphinx: {
    name: '스핑크스',
    image: sphinx,
    width: 291,
    height: 360,
    motion: null,
    lines: ['스핑크스가 내는 O/X 문제를 맞히면 바로 지나가요', '틀리면 5초 동안 제자리에 멈췄다가 지나가요'],
  },
} as const
