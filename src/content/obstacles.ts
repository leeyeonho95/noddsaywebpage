import crocodile from '../assets/obstacles/crocodile.webp'
import log from '../assets/obstacles/log.webp'
import snowball from '../assets/obstacles/snowball.svg'
import snowman from '../assets/obstacles/snowman.svg'
import sphinx from '../assets/obstacles/sphinx.webp'

// Obstacle art from the team (transparent, trimmed and resized; the sphinx's flat background was removed).
// The escape motions follow the game design (docs/planning/game-design-v1.md, 코스와 장애물): duck under the low log,
// clap like a crocodile's jaws. The sphinx uses the team's O/X motions and freezes the carpet for 5 seconds on a miss.
// Christmas (game docs/design/christmas-snowman-throw.md): rolling snowballs are steered around with the oars (no motion);
// the snowman stops the sled and throws at the rowers' heads, dodged by both leaning to the shown side.
// Each map lists its own obstacles in content/maps.ts. guide links to the matching section of the motion guide.
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
    lines: ['악어가 나타나 배를 붙잡아요', '두 팔을 위아래로 벌렸다가 모으는 악어 박수를 총 3번 성공해야 빠져나가요'],
  },
  sphinx: {
    name: '스핑크스',
    image: sphinx,
    width: 291,
    height: 360,
    motion: 'O/X 모션',
    guide: { id: 'sphinx-motion', label: 'O/X 모션 보기' },
    lines: ['스핑크스가 내는 O/X 문제를 맞히면 바로 지나가요', '틀리면 5초 동안 제자리에 멈췄다가 지나가요'],
  },
  snowball: {
    name: '굴러오는 눈덩이',
    image: snowball,
    width: 96,
    height: 96,
    lines: [
      '얼음길로 굴러오는 눈덩이는 노를 저어 썰매를 빈 쪽으로 돌려 피해요',
      '왼쪽으로 피하려면 오른쪽 노를, 오른쪽으로 피하려면 왼쪽 노를 앞으로 저어요',
    ],
  },
  snowman: {
    name: '눈사람',
    image: snowman,
    width: 96,
    height: 96,
    motion: '왼쪽·오른쪽 피하기',
    guide: { id: 'snowman-motion', label: '왼쪽·오른쪽 피하기 모션 보기' },
    lines: [
      '썰매가 멈추면 눈사람이 솟아올라 머리 쪽으로 눈을 던져요',
      '화면에 나온 방향으로 두 사람이 함께 몸을 기울여야 피할 수 있어요',
    ],
  },
} as const
