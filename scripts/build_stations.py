# 오피넷 전국개별주유소가격.csv(2026-09-19)에서 울주군 등유 판매 주유소만 뽑아 src/data/stations.json으로 저장
import csv, json, sys
src = sys.argv[1]
rename = {"청량면": "청량읍", "삼남면": "삼남읍"}
out = []
for r in csv.DictReader(open(src, encoding="cp949")):
    if "울주군" not in r["지역"]:
        continue
    try:
        price = float(r["실내등유"])
    except ValueError:
        price = 0
    if price <= 0:
        continue
    em = next((t for t in r["주소"].split() if t.endswith(("읍", "면"))), "기타")
    out.append({"id": r["고유번호"], "name": r["상호"], "addr": r["주소"], "brand": r["상표"],
                "emd": rename.get(em, em), "kerosene": price})
out.sort(key=lambda s: s["kerosene"])
json.dump({"source": "오피넷 전국개별주유소가격", "asOf": "2026-09-19", "stations": out},
          open("src/data/stations.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out))
