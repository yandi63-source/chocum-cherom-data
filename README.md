# 처음처럼 - 데이터 저장소

다음카페 [고타야 · 처음처럼의 영상일기](https://m.cafe.daum.net/123ad/9vTE) 게시글을 수집해
"처음처럼" 앱에 제공하는 데이터 저장소입니다.

- `scraper.py` — 새 글 자동 감지 스크래퍼 (GitHub Actions로 주 2회 실행)
- `site/data/index.json` — 글 목록 (앱이 처음 읽는 파일)
- `site/data/posts/{id}.json` — 개별 글 본문
- 앱 데이터 URL: `https://yandi63-source.github.io/chocum-cherom-data/site/data`
