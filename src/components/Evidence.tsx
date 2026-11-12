import data from "@/data/validation.json";

// 소개 페이지 '검증 결과' 구역.
// - 그래프 자료(src/data/validation.json): 제주 가정용 실내등유 월별 소비량과, 직전 24개월 기록으로 계수를 맞춘 모델의 예측값
// - 아래 숫자는 분석 코드를 돌려 나온 값이다(기온·소비 검증, 소진 전 배달 모의실험). 알림 규칙을 바꾸면 모의실험 숫자도 다시 내야 한다
const FIGS = [
  {
    l: "기온과 등유 소비의 상관",
    v: "0.88~0.94",
    s: "그달 난방도일과 월 소비량. 제주시·서귀포시 2018~2025년 96개월",
  },
  {
    l: "겨울 한 달 소비량의 예측 오차",
    v: "15~20%",
    s: "작년 같은 달 값을 그대로 쓰면 19~27%. 2020~2025년 겨울 30개월",
  },
  {
    l: "기름이 떨어지기 전에 배달된 비율",
    v: "97.6~99.9%",
    s: "기온을 보지 않고 하루 평균으로만 재면 87~89%. 가상 가구 모의실험",
  },
];

const LIMITS = [
  "시 단위 합계로 잰 값입니다. 한 집의 오차는 이보다 클 수 있습니다.",
  "서귀포시의 최근 두 겨울은 작년 같은 달 값을 그대로 쓴 쪽이 더 맞았습니다(오차 16.4% 대 모델 23.5%).",
  "그달 기온을 안다고 치고 잰 값입니다. 실제 서비스는 예보를 쓰므로 며칠 뒤 예측은 더 흔들립니다.",
  "모의실험의 가상 가구는 기온에 맞춰 쓰도록 만들어서 기온을 보는 방식에 유리합니다. 난방을 참는 집, 집을 비운 기간, 전기장판을 같이 쓰는 집, 반 드럼씩 사는 습관은 담지 못했습니다.",
  "'소진 3주 안일 때만 전화' 조건을 빼면 98.5~100%입니다. 가을에 한 달 반 일찍 전화가 가는 것을 막으려고 조금 내준 값입니다.",
];

const W = 560;
const H = 150;
const TOP = 8;
const BOTTOM = 22;

function Chart({ name, actual, model }: { name: string; actual: number[]; model: number[] }) {
  const max = Math.max(...actual, ...model);
  const x = (i: number) => (i / (actual.length - 1)) * W;
  const y = (v: number) => TOP + (1 - v / max) * (H - TOP - BOTTOM);
  const line = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const firstYear = Number(data.start.slice(0, 4));
  const years = Array.from({ length: actual.length / 12 }, (_, k) => firstYear + k);
  return (
    <figure>
      <figcaption className="text-[15px] font-medium">{name}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`${name} 가정용 실내등유 월별 소비량과 모델 예측, ${years[0]}년부터 ${years[years.length - 1]}년까지. 겨울마다 두 선이 함께 오르내립니다`}
      >
        {years.map((year, k) => (
          <g key={year}>
            <line x1={x(k * 12)} x2={x(k * 12)} y1={TOP} y2={y(0)} stroke="var(--line)" strokeDasharray="2 4" />
            <text x={x(k * 12) + 4} y={H - 6} fontSize="11" fill="var(--muted)">
              {year}
            </text>
          </g>
        ))}
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--line)" />
        <path d={line(actual)} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
        <path d={line(model)} fill="none" stroke="var(--fuel)" strokeWidth="2" />
      </svg>
    </figure>
  );
}

export default function Evidence() {
  return (
    <section id="evidence" className="wrap py-20 md:py-32">
      <h2 className="text-[22px] md:text-[24px]">이 예측은 얼마나 맞나</h2>
      <p className="mt-8 max-w-4xl text-[18px] font-light leading-[1.75] md:text-[20px]">
        두 가지를 나눠서 확인했습니다. 기온으로 등유 소비가 설명되는지는 실제 공공데이터로, 기름이 떨어지기 전에 배달할 수 있는지는
        실제 기온에 가상 가구를 얹은 모의실험으로 봤습니다. 실제 가구로 검증한 것은 아직 없습니다.
      </p>

      <dl className="mt-14 grid grid-cols-1 gap-y-12 md:grid-cols-3">
        {FIGS.map((f) => (
          <div key={f.l} className="border-l border-[#a9a9a9] py-1 pl-6 pr-4 md:pl-8">
            <dt className="text-[18px] font-normal leading-snug md:text-[20px]">{f.l}</dt>
            <dd className="num mt-7 whitespace-nowrap text-[38px] font-light leading-[1.2] lg:text-[clamp(28px,2.75vw,42px)]">{f.v}</dd>
            <dd className="mt-7 text-[15px] text-muted md:text-[16px]">{f.s}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-16 grid gap-12 md:mt-20 md:grid-cols-[1.35fr_1fr] md:gap-16">
        <div>
          <h3 className="border-t border-ink pt-5 text-[20px] font-medium">실제 소비량과 모델 예측</h3>
          <div className="mt-6 space-y-8">
            {data.sites.map((s) => (
              <Chart key={s.name} {...s} />
            ))}
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="w-5 border-t-2 border-ink" />
              실제 소비량
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="w-5 border-t-[3px] border-fuel" />
              모델 예측 (그달 기온과 직전 24개월 기록만 씀)
            </li>
          </ul>
          <p className="mt-4 text-sm text-muted">
            제주 가정용 실내등유 월별 소비량. 원본 파일에 단위가 없어 세로 눈금은 뺐습니다. 자료: {data.source}
          </p>
        </div>
        <div>
          <h3 className="border-t border-ink pt-5 text-[20px] font-medium">한계</h3>
          <ul className="mt-4 text-[16px] md:text-[17px]">
            {LIMITS.map((t) => (
              <li key={t} className="border-b border-line py-3">
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            모의실험: 영월·울주·장흥의 실제 기온 세 겨울에 가상 가구 3,600가구-겨울을 돌렸습니다. 200L 탱크, 여유분 50L, 알림 뒤
            3일 안 배달, 하루 사용량이 20~50% 흔들린다고 두었습니다.
          </p>
        </div>
      </div>
    </section>
  );
}
