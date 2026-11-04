import lightningArrow from '../assets/items/lightning-arrow.webp'
import siren from '../assets/items/siren.webp'
import wings from '../assets/items/wings.webp'

// Item icons from the game repo (Assets/_Project/Art/UI/Items), resized to 256x256.
// Uses follow the game design (docs/planning/game-design-v1.md, 아이템); the effects are not implemented in the game yet.
export const ITEMS = [
  { name: '날개', image: wings, lines: ['우리 배가 날아올라요.', '그동안은 노를 젓지 않아도 돼요.'] },
  { name: '세이렌', image: siren, lines: ['상대 팀을 잠시 기절시켜요.'] },
  { name: '번개 화살', image: lightningArrow, lines: ['상대 팀을 공격해요.', '맞은 팀은 방어 모션을 해야 풀려나요.'] },
] as const
