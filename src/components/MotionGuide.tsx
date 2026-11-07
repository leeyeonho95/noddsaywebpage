import escapeX from '../assets/motions/01-escape-x-01.png'
import hula from '../assets/motions/11-hula-01.png'
import surprise from '../assets/motions/12-surprise-01.png'
import patmat from '../assets/motions/13-patmat-01.png'
import fusion from '../assets/motions/14-fusion-01.png'
import tada from '../assets/motions/15-tada-01.png'

const DEFENSES = [
  { name: '울라울라', image: hula, description: '두 사람이 팔을 앞으로 들고 함께 흔들어요.' },
  { name: '상상도 못한 정체', image: surprise, description: '두 사람이 각각 한 팔은 위로, 다른 팔은 아래로 꺾어요.' },
  { name: '패트와 매트', image: patmat, description: '두 사람이 팔을 곧게 뻗어 주먹을 맞대요.' },
  { name: '퓨전', image: fusion, description: '서로 몸을 기울여 위아래 손을 모두 맞대요.' },
  { name: '짜란', image: tada, description: '두 사람이 화면에 나온 서로 다른 자세를 따라 해요.' },
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
          <p className="game-copy">웹캠 앞에서 두 사람이 한 배의 왼쪽·오른쪽 노를 나눠 맡아요.</p>
        </div>

        <div className="motion-basics" aria-label="노 젓기와 탈출">
          <div className="motion-rowing">
            <h3 className="game-subheading">배를 움직이는 법</h3>
            <div className="motion-strokes">
              <div>
                <span aria-hidden="true" className="motion-stroke-arrow">→</span>
                <h4>전진</h4>
                <p>손을 앞에서 뒤로 당기며 노를 저어요.</p>
              </div>
              <div>
                <span aria-hidden="true" className="motion-stroke-arrow">←</span>
                <h4>후진</h4>
                <p>손을 뒤에서 앞으로 밀며 노를 저어요.</p>
              </div>
            </div>
            <p className="motion-direction"><span>둘이 함께 전진하면 직진하고, 한쪽만 저으면 방향이 바뀌어요.</span><span>둘이 함께 후진하면 배가 뒤로 움직여요.</span></p>
          </div>

          <div className="motion-escape">
            <MotionPose image={escapeX} />
            <div>
              <p className="game-kicker">배가 걸렸을 때 · SOS</p>
              <h3 className="game-subheading">둘이 함께 탈출 X</h3>
              <p><span>두 팔을 가슴 앞에서 X자로 교차해요.</span><span>같은 팀 두 사람의 X 동작이 2초 안에 인식되면 배가 코스 중앙으로 돌아와요.</span></p>
              <p><span>복귀 후 3초간 멈추며, 다시 탈출하기까지 20초의 쿨타임이 있어요.</span><span>탈출하는 동안에도 경기 시간은 흘러요.</span></p>
            </div>
          </div>
        </div>

        <div className="motion-defense-heading">
          <div>
            <p className="game-kicker">번개 화살에 맞았다면</p>
            <h3 className="game-subheading">화면에 나온 방어 동작을 함께!</h3>
          </div>
          <p className="game-copy"><span>5가지 중 한 동작이 무작위로 나와요.</span><span>두 사람이 5초 안에 성공하면 바로 풀려요.</span><span>실패하면 3초 더 기절해요.</span></p>
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
