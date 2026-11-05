import crocodile from '../assets/obstacles/crocodile.webp'
import log from '../assets/obstacles/log.webp'

// Obstacle art from the team (transparent, trimmed and resized). The escape motions follow the game design
// (docs/planning/game-design-v1.md, 코스와 장애물): duck under the low log, clap like a crocodile's jaws.
export const OBSTACLES = [
  {
    name: '통나무',
    image: log,
    width: 640,
    height: 95,
    motion: '숙이기',
    lines: ['낮은 통나무가 물길을 가로막아요.', '두 사람이 모두 몸을 숙여야 빠져나갈 수 있어요.'],
  },
  {
    name: '악어',
    image: crocodile,
    width: 509,
    height: 360,
    motion: '악어 박수',
    lines: ['악어가 나타나 배를 붙잡아요.', '두 팔을 벌렸다가 박수를 치는 악어 박수로 빠져나가요.'],
  },
] as const
