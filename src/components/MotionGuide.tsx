import escapeX from '../assets/motions/01-escape-x-01.png'
import crocOpen from '../assets/motions/02-croc-open-01.png'
import crocClose from '../assets/motions/03-croc-close-01.png'
import bowFront from '../assets/motions/06-bow-front-01.png'
import circleO from '../assets/motions/08-circle-o-01.png'
import eagle from '../assets/motions/09-eagle-01.png'
import hula from '../assets/motions/11-hula-01.png'
import surprise from '../assets/motions/12-surprise-01.png'
import patmat from '../assets/motions/13-patmat-01.png'
import fusion from '../assets/motions/14-fusion-01.png'
import tada from '../assets/motions/15-tada-01.png'

const DEFENSES = [
  { name: '울라울라', image: hula, description: '두 사람이 팔을 옆으로 모아서 들고 흔들어요' },
  { name: '상상도 못한 정체', image: surprise, description: '두 사람이 각각 한 팔은 위로, 다른 팔은 아래로 꺾어요' },
  { name: '패트와 매트', image: patmat, description: '두 사람이 팔을 곧게 뻗어 주먹을 맞대요' },
  { name: '퓨전', image: fusion, description: '서로 몸을 기울여 위아래 손을 모두 맞대요' },
  { name: '짜란', image: tada, description: '두 사람이 화면에 나온 서로 다른 자세를 따라 해요' },
] as const

function MotionPose({ image }: { image: string }) {
  return <span aria-hidden="true" className="motion-pose" style={{ backgroundImage: `url(${image})` }} />
}

export function MotionGuide() {
  return (
    <section id="motions" className="game-motions" aria-labelledby="motions-title">
      <div className="game-container game-section-space">
        <div className="game-section-title">
          <p className="game-kicker">게임 조작 가이드</p>
          <h2 id="motions-title" className="game-heading">몸으로 움직이는 노디세이</h2>
          <p className="game-copy">웹캠 앞에서 두 사람이 한 배의 왼쪽·오른쪽 노를 나눠 맡아요</p>
        </div>

        <div className="motion-basics" aria-label="노 젓기와 탈출, 아이템 사용">
          <div className="motion-rowing">
            <h3 className="game-subheading">배를 움직이는 법</h3>
            <div className="motion-strokes">
              <div>
                <span aria-hidden="true" className="motion-stroke-arrow">→</span>
                <h4>전진</h4>
                <p>손을 앞에서 뒤로 당기며 노를 저어요</p>
              </div>
              <div>
                <span aria-hidden="true" className="motion-stroke-arrow">←</span>
                <h4>후진</h4>
                <p>손을 뒤에서 앞으로 밀며 노를 저어요</p>
              </div>
            </div>
            <p className="motion-direction"><span>둘이 함께 전진하면 직진하고, 한쪽만 저으면 방향이 바뀌어요</span><span>둘이 함께 후진하면 배가 뒤로 움직여요</span></p>
          </div>

          <div className="motion-escape">
            <MotionPose image={escapeX} />
            <div>
              <p className="game-kicker">배가 걸렸을 때 · SOS</p>
              <h3 className="game-subheading">둘이 함께 탈출 X</h3>
              <p><span>두 팔을 가슴 앞에서 X자로 교차해요</span><span>같은 팀 두 사람의 X 동작이 2초 안에 인식되면 배가 코스 중앙으로 돌아와요</span></p>
              <p><span>복귀 후 3초간 멈추며, 다시 탈출하기까지 20초의 쿨타임이 있어요</span><span>탈출하는 동안에도 경기 시간은 흘러요</span></p>
            </div>
          </div>

          <div id="item-use-motion" className="motion-item-use">
            <MotionPose image={eagle} />
            <div>
              <p className="game-kicker">아이템 사용 · 공격 동작</p>
              <h3 className="game-subheading">둘이 함께 독수리 포즈</h3>
              <p><span>노 젓기를 잠시 멈추고 팔을 양옆으로 벌려 손목을 바깥쪽으로 꺾어요</span><span>두 사람이 3초 안에 성공하면 가장 먼저 얻은 아이템이 사용돼요</span></p>
            </div>
          </div>
        </div>

        <div id="obstacle-motions" className="motion-obstacles-heading">
          <p className="game-kicker">강 맵 · 장애물 대응</p>
          <h3 className="game-subheading">통나무와 악어도 몸으로 빠져나가요</h3>
          <p className="game-copy">화면에 장애물이 나타나면 안내에 맞춰 두 사람이 함께 동작해요</p>
        </div>
        <ul className="motion-obstacle-list" aria-label="강 맵 장애물 모션">
          <li className="motion-obstacle-card">
            <div className="motion-obstacle-visual">
              <MotionPose image={bowFront} />
            </div>
            <div>
              <p className="game-kicker">통나무 · 숙이기</p>
              <h4>두 사람이 함께 몸을 숙여요</h4>
              <p><span>낮은 통나무가 보이면 노 젓기를 잠시 멈춰요</span><span>같은 배의 두 사람이 모두 몸을 낮추면 통과해요</span></p>
            </div>
          </li>
          <li className="motion-obstacle-card">
            <div className="motion-obstacle-visual motion-obstacle-sequence" aria-label="팔을 위아래로 벌린 뒤 모으는 동작">
              <MotionPose image={crocOpen} />
              <span aria-hidden="true">→</span>
              <MotionPose image={crocClose} />
            </div>
            <div>
              <p className="game-kicker">악어 · 악어 박수</p>
              <h4>두 팔을 위아래로 벌렸다가 모아요</h4>
              <p><span>악어가 배를 붙잡으면 두 팔을 위아래로 벌렸다가 모아요</span><span>두 사람이 함께 악어 박수를 3번 치면 빠져나가요</span></p>
            </div>
          </li>
        </ul>

        <div id="sphinx-motion" className="motion-obstacles-heading">
          <p className="game-kicker">사막 맵 · 장애물 대응</p>
          <h3 className="game-subheading">스핑크스의 문제에 몸으로 답해요</h3>
          <p className="game-copy">O와 X 중 정답이라고 생각하는 동작을 두 사람이 각각 만들어요</p>
        </div>
        <div className="motion-sphinx">
          <div className="motion-sphinx-poses" aria-label="O와 X 모션">
            <div>
              <MotionPose image={circleO} />
              <strong>O</strong>
            </div>
            <div>
              <MotionPose image={escapeX} />
              <strong>X</strong>
            </div>
          </div>
          <div>
            <p className="game-kicker">스핑크스 · O/X 모션</p>
            <h4 className="game-subheading">두 사람 모두 정답을 맞춰야 해요</h4>
            <p className="game-copy">
              <span>O는 두 팔을 머리 위로 둥글게 모아요</span>
              <span>X는 두 팔을 가슴 앞에서 교차해요</span>
              <span>정답이면 바로 통과하고, 오답이면 5초간 멈춰있어요</span>
            </p>
          </div>
        </div>

        <div id="defense-motions" className="motion-defense-heading">
          <p className="game-kicker">번개 화살에 맞았다면</p>
          <h3 className="game-subheading">화면에 나온 방어 동작을 함께!</h3>
          <p className="game-copy"><span>5가지 중 한 동작이 무작위로 나와요</span><span>두 사람이 5초 안에 성공하면 방어 성공! 실패하면 3초 더 기절해요</span></p>
        </div>
        <ul className="motion-defense-list">
          {DEFENSES.map((defense) => (
            <li key={defense.name}>
              <MotionPose image={defense.image} />
              <div>
                <h4>{defense.name}</h4>
                <p>{defense.description}</p>
              </div>
            </li>
          ))}
        </ul>

      </div>
    </section>
  )
}
