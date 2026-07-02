# -*- coding: utf-8 -*-
"""
고타야 카페 '처음처럼의 영상일기' 스크래퍼 (자동 업데이트판)
- 게시판 ID: 9vTE, 카페 123ad
- 기존 원본(scraper.py)의 검증된 파싱 로직 재사용
- 변경점:
    1) max_id 고정 제거 → 마지막 수집 id 다음부터 시작, 연속 404가 STOP_AFTER회
       이어지면 "최신 글까지 다 긁었다"로 보고 종료 (새 글 자동 감지)
    2) posts.json 갱신 후 index.json / posts/{id}.json 자동 재생성
    3) GitHub Actions 등 자동 실행 대비 (출력 폴더 = ./site/data)

실행: python scraper.py
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import os
import re
import urllib.parse

# 스크랩 글의 장식용(비사진) 이미지 - 이 패턴이 fname에 들어있으면 제외
# (퍼온 기사의 버튼/아이콘/스페이서 gif 등)
JUNK_IMG_HINTS = ("spc.gif", "blank.gif", "spacer", "1x1", "_icon.gif",
                  "nblog/spc", "buttonimage", "emoticon", "btn_", "urlcopy",
                  "/icon", "icon_", "bullet", "bg.gif", "bg_", "line.gif",
                  "title.gif", "author_icon", "/btn", "arrow", "blank")

BASE_URL = "https://m.cafe.daum.net/123ad/9vTE"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
}

# 새 글 자동 감지: 마지막 실제 글 이후 이만큼 연속으로 없으면 종료
STOP_AFTER_CONSECUTIVE_404 = 30
# 안전 상한 (무한루프 방지)
HARD_MAX_ID = 5000

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "site", "data")
POSTS_DIR = os.path.join(DATA_DIR, "posts")
DATA_FILE = os.path.join(DATA_DIR, "posts.json")
INDEX_FILE = os.path.join(DATA_DIR, "index.json")


def load_posts():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_posts(posts):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)


def fetch_post(dataid):
    """단일 게시글 스크래핑 (원본 로직 그대로)"""
    url = f"{BASE_URL}/{dataid}"
    resp = requests.get(url, headers=HEADERS, timeout=15)
    # 다음카페는 없는 글에 404가 아닌 403을 돌려준다
    if resp.status_code in (403, 404, 410):
        return None
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")

    title_el = (soup.select_one("h3.tit_subject")
                or soup.select_one(".tit_subject")
                or soup.select_one("title"))
    title = title_el.get_text(strip=True) if title_el else ""

    # 날짜는 <span class="num_subject">26.06.21</span> 형태 (YY.MM.DD)
    date_str = ""
    for el in soup.select(".num_subject, .txt_detail, .date"):
        m = re.search(r'(\d{2,4}[./]\d{1,2}[./]\d{1,2})', el.get_text(strip=True))
        if m:
            date_str = m.group(1)
            break

    content_el = (soup.select_one("#article")
                  or soup.select_one(".article_view")
                  or soup.select_one(".cont_article"))

    text_content = ""
    images = []
    if content_el:
        for img in content_el.find_all("img"):
            src = img.get("src") or img.get("data-src") or ""
            if not src or "daumcdn" not in src:
                continue
            if "/relay/" in src:
                # relay(스크랩/퍼온) 이미지는 실제 주소가 ?fname= 안에 있으므로 쿼리 유지.
                # 단, 스페이서/아이콘 등 장식용 gif는 제외한다.
                m = re.search(r'fname=([^&]+)', src)
                if m:
                    real = urllib.parse.unquote(m.group(1)).lower()
                    if any(j in real for j in JUNK_IMG_HINTS):
                        continue
                images.append(src)
            else:
                # 일반 이미지는 쿼리 제거(기존 동작 유지)
                images.append(re.sub(r'\?.*$', '', src))
        for br in content_el.find_all("br"):
            br.replace_with("\n")
        for p in content_el.find_all("p"):
            p.insert_after("\n")
        text_content = re.sub(r'\n{3,}', '\n\n', content_el.get_text()).strip()

    if not title and not text_content:
        return None

    return {
        "id": dataid,
        "title": title,
        "date": date_str,
        "text": text_content,
        "images": images,
        "url": url,
    }


def build_index(posts):
    """posts.json에서 목록용 경량 index.json 생성"""
    index = [{
        "id": p["id"],
        "title": p.get("title", ""),
        "date": p.get("date", ""),
        "img_count": len(p.get("images", [])),
        "text_len": len(p.get("text", "")),
    } for p in posts]
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)


def write_individual(posts):
    """웹사이트용 개별 posts/{id}.json 생성"""
    os.makedirs(POSTS_DIR, exist_ok=True)
    for p in posts:
        with open(os.path.join(POSTS_DIR, f"{p['id']}.json"), "w", encoding="utf-8") as f:
            json.dump(p, f, ensure_ascii=False, indent=2)


def main():
    posts = load_posts()
    existing_ids = {p["id"] for p in posts}
    start_id = (max(existing_ids) + 1) if existing_ids else 1

    # 접근 차단 감지: 이미 있는 글이 안 열리면 (전부 403) IP 차단으로 보고 중단
    if existing_ids:
        probe_id = max(existing_ids)
        if fetch_post(probe_id) is None:
            raise SystemExit(
                f"[중단] 기존 글 id={probe_id}이 열리지 않음 → 카페 접근 차단 의심. "
                "데이터를 건드리지 않고 종료합니다.")
        time.sleep(1)

    print(f"=== 고타야 카페 스크래퍼 (자동 감지) ===")
    print(f"기존 수집: {len(posts)}편, 시작 ID: {start_id}")

    consecutive_404 = 0
    new_count = 0
    dataid = start_id

    while dataid <= HARD_MAX_ID:
        try:
            post = fetch_post(dataid)
        except Exception as e:
            print(f"  [ERROR] {dataid}: {e} (2초 후 재시도 건너뜀)")
            time.sleep(2)
            dataid += 1
            continue

        if post is None:
            consecutive_404 += 1
            if consecutive_404 >= STOP_AFTER_CONSECUTIVE_404:
                print(f"  {STOP_AFTER_CONSECUTIVE_404}개 연속 없음 → 최신 글까지 완료로 판단, 종료")
                break
        else:
            consecutive_404 = 0
            posts.append(post)
            new_count += 1
            print(f"  [+{new_count}] id={dataid} {post['date']} | {post['title'][:40]}")

        dataid += 1
        time.sleep(0.5)

    posts.sort(key=lambda x: x["id"])
    save_posts(posts)
    build_index(posts)
    write_individual(posts)

    print(f"\n=== 완료 ===")
    print(f"신규 {new_count}편 추가 → 총 {len(posts)}편")
    print(f"저장: {DATA_FILE}")
    print(f"      {INDEX_FILE}")


if __name__ == "__main__":
    main()
