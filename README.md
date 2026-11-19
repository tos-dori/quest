# Questline — 현실 행동 RPG

정적 게임은 GitHub Pages에서 제공하고, 개인별 진행은 Supabase PostgreSQL에 저장할 수 있도록 준비된 버전입니다.

## 현재 상태

- `index.html`: v0.2.1을 기반으로 한 게임, 로그인/서버 저장 연동 준비 UI
- `cloud-sync.js`: Supabase 인증, 상태 불러오기·저장, 리비전 충돌 검출, 백업·복구 안내
- `cloud-config.js`: 공개 가능한 프로젝트 URL 및 publishable/anon 키를 넣는 설정 파일 (초기값 비어 있음)
- `supabase.sql`: 서버 측 게임 데이터와 이전 버전 30개 백업, RLS, 리비전 검사 RPC

**중요:** Supabase 프로젝트가 연결되지 않은 동안에는 기존 v0.2.1처럼 브라우저 로컬 저장으로 작동합니다. 이 상태는 기기 간 동기화가 아닙니다. 서버를 설정한 뒤부터 진행 데이터는 서버를 기준으로 저장하며, 브라우저에는 로그인 세션 및 이전 로컬 게임 원본만 남습니다.

## 서버 저장 활성화

1. Supabase 프로젝트를 생성하고 `supabase.sql`을 SQL Editor에서 실행합니다.
2. Supabase Authentication의 Email 로그인(OTP/매직 링크)을 활성화합니다.
3. Authentication → URL Configuration의 Site URL 및 Redirect URLs에 GitHub Pages 주소 `https://tos-dori.github.io/quest/`를 추가합니다.
4. Supabase Project URL 및 `publishable` (또는 레거시 `anon`) 키를 `cloud-config.js`에 입력하여 GitHub에 커밋합니다. **`service_role` 또는 `secret` 키는 절대로 입력하면 안 됩니다.**
5. GitHub Pages를 `main` 브랜치의 루트(`/`)에서 배포하도록 설정합니다.
6. Mac에서 로그인 이메일을 받아 접속하고, iPhone에서 **같은 이메일**로 로그인합니다. 같은 서버 진행이 나타나는지 확인합니다.
7. 첫 로그인 때 이 기기에 이전 게임 저장이 있는 경우에만 서버로 한 번 가져올지 묻습니다. 서버에 이미 진행이 있으면 기존 서버 데이터를 우선 사용하고, 자동 덮어쓰기를 하지 않습니다.

> Supabase 프로젝트를 생성·연결하지 않았다면 계정별 서버 저장이 동작한다고 간주하지 마세요.

## 데이터·동기화 안전

- `public.questline_saves.game_state`: 최신 게임 전체 JSON (스키마 v2)
- `revision`: 서버 저장 때마다 증가. 다른 기기나 관리자가 먼저 수정하면 이전 revision의 덮어쓰기를 거부합니다.
- `public.questline_save_history`: 업데이트 직전 상태를 최대 30개 보관합니다.
- 데이터 행은 로그인한 `auth.uid()`의 소유이며, Row Level Security가 타 사용자 조회를 차단합니다.
- 동시 수정 충돌 시 기존 데이터로 덮어쓰지 않고 백업 후 서버 최신 상태를 불러올 수 있는 선택지를 보여줍니다.
- 기존 `firstlight_rpg_v2` localStorage 게임 데이터는 마이그레이션 원본으로 **삭제하지 않습니다**.
- Todo Mate는 여전히 가져온 사본이며, 자동 양방향 동기화 기능은 별도 작업입니다.

## ChatGPT를 통한 수치 수정 ('치트')

Supabase를 ChatGPT에 연결하면, 사용자가 **명시적으로 요청했을 때** 서버의 수치를 조회·수정하는 작업이 가능합니다. 수정 전 현재 상태와 계정 식별자를 확인하고 필요한 필드만 바꿉니다.

예를 들어 사용자가 '골드 3000으로 수정'을 요청할 때는 서버에서 정확한 `user_id`와 현재 `revision`을 확인하고 다음과 같이 수행합니다.

```sql
UPDATE public.questline_saves
SET game_state = jsonb_set(game_state, '{gold}', '3000'::jsonb),
    revision = revision + 1,
    updated_at = now()
WHERE user_id = '<검증된-사용자-UUID>'::uuid
  AND revision = <읽어온-현재-revision>;
```

이 UPDATE는 이전 상태 백업 트리거를 실행합니다. 수정 후 해당 기기에서 화면을 다시 열거나 계정 메뉴의 '서버에서 최신 진행 확인'을 누르면 새 상태를 가져옵니다. 여러 기기에서 동시에 사용 중이라면 변경 충돌 해결 안내를 따릅니다.

## 보안

정적 클라이언트에 비밀키를 두지 않습니다. 브라우저에 포함하는 것은 publishable/anon 키뿐이며, 서버 RLS와 사용자 인증으로 데이터 접근을 제한합니다. GitHub Pages 자체를 데이터베이스로 이용하지 않습니다.