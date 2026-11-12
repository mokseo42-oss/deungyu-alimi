// 첫 화면 오른쪽 그림: 영남알프스 아래 시골집 마당의 실외 등유 탱크.
// 사진 대신 그린 장면입니다. 처음 열릴 때 눈금 호스의 기름이 네 칸 중 한 칸까지 내려갑니다(움직임 줄이기 설정이면 바로 한 칸).
export default function HeroScene() {
  return (
    <svg
      viewBox="0 0 800 960"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="눈 덮인 산 아래 시골집 마당에 주황색 실외 등유 탱크가 서 있고, 탱크 옆 눈금 호스의 기름이 네 칸 중 한 칸까지 내려와 있는 그림"
    >
      <defs>
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6dce8" />
          <stop offset="0.36" stopColor="#e8ebf2" />
          <stop offset="0.55" stopColor="#f5f1ec" />
          <stop offset="1" stopColor="#f5f1ec" />
        </linearGradient>
        <linearGradient id="hs-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3e7ee" />
          <stop offset="0.35" stopColor="#ccd3df" />
          <stop offset="1" stopColor="#c3cbd9" />
        </linearGradient>
        <filter id="hs-edge" x="-10%" y="-60%" width="120%" height="220%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <linearGradient id="hs-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#f6f3ee" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="hs-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ebe7e1" />
          <stop offset="1" stopColor="#ddd8d0" />
        </linearGradient>
        <linearGradient id="hs-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f4f1ec" />
          <stop offset="1" stopColor="#e6e2dc" />
        </linearGradient>
        <linearGradient id="hs-eave-shadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a5148" stopOpacity="0.22" />
          <stop offset="1" stopColor="#5a5148" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="hs-glass" cx="0.42" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#f8d6a4" />
          <stop offset="0.6" stopColor="#efab6c" />
          <stop offset="1" stopColor="#d9844a" />
        </radialGradient>
        {/* 왼쪽에서 들어오는 아침빛을 받은 원통 */}
        <linearGradient id="hs-tank" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a2441a" />
          <stop offset="0.22" stopColor="#d4692c" />
          <stop offset="0.36" stopColor="#e99257" />
          <stop offset="0.55" stopColor="#c95d25" />
          <stop offset="0.85" stopColor="#9c4119" />
          <stop offset="1" stopColor="#7f3313" />
        </linearGradient>
        <linearGradient id="hs-tank-top" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#dc7a40" />
          <stop offset="1" stopColor="#b5521f" />
        </linearGradient>
        <filter id="hs-soft" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="hs-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0.09 0" />
        </filter>
      </defs>

      {/* 하늘과 산 */}
      <rect width="800" height="960" fill="url(#hs-sky)" />
      <path
        d="M0 430 Q60 362 130 392 Q200 300 280 350 Q340 302 400 330 Q470 252 560 314 Q630 278 700 318 Q752 298 800 314 V660 H0 Z"
        fill="url(#hs-far)"
      />
      <path
        d="M0 520 Q90 452 180 490 Q260 440 350 470 Q440 428 530 474 Q620 438 710 454 Q770 460 800 468 V660 H0 Z"
        fill="#b4bdcd"
      />
      <rect y="470" width="800" height="190" fill="url(#hs-haze)" />

      {/* 마당 */}
      <rect y="606" width="800" height="354" fill="url(#hs-ground)" />

      {/* 집 벽, 처마, 창 */}
      <rect x="360" y="330" width="440" height="290" fill="url(#hs-wall)" />
      <rect x="360" y="598" width="440" height="22" fill="#d8d2c9" />
      <rect x="360" y="344" width="440" height="34" fill="url(#hs-eave-shadow)" />
      <path d="M330 320 L800 292 L800 326 L330 350 Z" fill="#4e5562" />
      <path d="M330 320 L800 292 L800 284 Q640 290 560 297 Q450 306 330 313 Z" fill="#ffffff" />
      <rect x="552" y="404" width="166" height="136" fill="#d9d2c8" />
      <rect x="562" y="414" width="146" height="116" fill="url(#hs-glass)" />
      <path d="M635 414 V530 M562 472 H708" stroke="#eae3d8" strokeWidth="6" />
      <rect x="544" y="538" width="182" height="9" fill="#cfc7bb" />
      <ellipse cx="640" cy="700" rx="150" ry="26" fill="#f3c48c" opacity="0.2" filter="url(#hs-soft)" />

      {/* 보일러로 들어가는 기름관 */}
      <path d="M318 600 H404 Q416 600 416 588 V566" fill="none" stroke="#777b85" strokeWidth="7" strokeLinecap="round" />
      <path d="M318 597 H404" stroke="#a9adb6" strokeWidth="1.5" />

      {/* 탱크 그림자, 받침 */}
      <ellipse cx="318" cy="676" rx="176" ry="15" fill="#4a3f35" opacity="0.26" filter="url(#hs-soft)" />
      <rect x="140" y="662" width="226" height="14" fill="#d2ccc3" />
      <rect x="140" y="662" width="226" height="2" fill="#e4dfd8" />
      <rect x="178" y="628" width="10" height="36" fill="#585c65" />
      <rect x="302" y="628" width="10" height="36" fill="#585c65" />

      {/* 실외 등유 탱크 */}
      <path d="M160 392 V624 A85 16 0 0 0 330 624 V392 Z" fill="url(#hs-tank)" />
      <path d="M160 470 A85 16 0 0 0 330 470" fill="none" stroke="#5c2108" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M160 473 A85 16 0 0 0 330 473" fill="none" stroke="#ffd9bd" strokeOpacity="0.22" strokeWidth="1.5" />
      <path d="M160 552 A85 16 0 0 0 330 552" fill="none" stroke="#5c2108" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M160 555 A85 16 0 0 0 330 555" fill="none" stroke="#ffd9bd" strokeOpacity="0.22" strokeWidth="1.5" />
      <ellipse cx="245" cy="392" rx="85" ry="16" fill="url(#hs-tank-top)" />
      <ellipse cx="240" cy="392" rx="70" ry="11" fill="#ffffff" opacity="0.92" />
      <rect x="226" y="374" width="38" height="16" fill="#7c3415" />
      <ellipse cx="245" cy="374" rx="19" ry="5" fill="#9e4a22" />
      <path d="M300 388 V352 Q300 342 310 342 Q318 342 318 350" fill="none" stroke="#6d717a" strokeWidth="4" strokeLinecap="round" />

      {/* 눈금 호스: 네 칸 */}
      <rect x="280" y="414" width="14" height="196" rx="7" fill="#fff8f0" fillOpacity="0.5" stroke="#f6e5d6" strokeWidth="1.5" />
      <rect
        className="scene-gauge"
        x="283"
        y="417"
        width="8"
        height="190"
        rx="4"
        fill="#f4b660"
        style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
      />
      <path d="M294 463 H302 M294 512 H302 M294 561 H302" stroke="#f6e5d6" strokeWidth="1.5" />
      <rect x="276" y="408" width="22" height="7" fill="#6d717a" />
      <rect x="276" y="609" width="22" height="7" fill="#6d717a" />

      {/* 마당에 남은 눈 */}
      <g fill="#ffffff" filter="url(#hs-edge)">
        <ellipse cx="90" cy="724" rx="64" ry="7" opacity="0.8" />
        <ellipse cx="486" cy="690" rx="46" ry="5" opacity="0.75" />
        <ellipse cx="716" cy="770" rx="74" ry="8" opacity="0.8" />
        <ellipse cx="260" cy="820" rx="96" ry="9" opacity="0.55" />
      </g>

      {/* 사진 같은 결 */}
      <rect width="800" height="960" filter="url(#hs-grain)" />
    </svg>
  );
}
