# Trello Clone – Complete Product Flow

## 1) Vision

A Trello-style workflow system where teams plan, execute, and track work using boards, lists, cards, members, notifications, and activity history.

---

## 2) End-to-End User Journey

## Phase A: Onboarding & Access

1. User lands on auth screen.
2. User registers or logs in.
3. System issues JWT and loads user profile.
4. User enters dashboard with visible identity badge.

### Success Criteria

- Authentication succeeds with valid credentials.
- Session persists across refresh.
- Expired sessions force re-authentication.

---

## Phase B: Workspace Entry (Board Discovery)

1. App fetches boards where user is owner/member.
2. User selects a board from sidebar.
3. Board detail loads with lists and cards.

### Success Criteria

- Only authorized boards appear.
- Empty state shown when user has no boards.

---

## Phase C: Planning Structure (Boards & Lists)

1. User creates board.
2. Owner adds collaborators (future complete flow).
3. User creates lists representing workflow stages (e.g., Todo, Doing, Done).
4. Lists are ordered by position.

### Success Criteria

- Board creation is immediate.
- List order is stable and persisted.

---

## Phase D: Work Item Lifecycle (Cards)

1. User creates cards inside list with title/description.
2. Card is prioritized by drag-and-drop within same list or across lists.
3. User updates card fields (title, description; future complete flow: due date, labels, checklist, attachments).
4. User archives/deletes completed or canceled work.

### Success Criteria

- Card movement updates UI optimistically.
- Final server state matches UI after save.
- Position recalculation is correct after each move.

---

## Phase E: Collaboration & Permissions

1. Owner invites members (future complete flow).
2. Role assignment controls access:
   - Owner: full control
   - Editor: content edits
   - Viewer: read-only
3. Unauthorized actions return `403`.

### Success Criteria

- Role enforcement at API layer.
- UI hides or disables restricted actions.

---

## Phase F: Awareness (Notifications & Activity)

1. System creates notifications for relevant actions (future complete flow trigger matrix).
2. User fetches latest notifications.
3. User marks notifications as read.
4. User sees board/card activity timeline (future complete flow).

### Success Criteria

- Most recent notifications appear first.
- Read state persists.

---

## Phase G: Reliability & Recovery

1. Any protected request returning `401` clears client session.
2. App routes user back to auth screen with clear message.
3. Re-login restores access.

### Success Criteria

- No app crashes on malformed/non-array API responses.
- Unauthorized states are recoverable by user.

---

## 3) Functional Flow by Layer

## Client Flow

1. Boot app.
2. Check `token` and optional `auth_user` from local storage.
3. If token exists but profile missing, call `/api/auth/me`.
4. Load boards.
5. Execute board/list/card actions with bearer token.
6. On `401`, clear session and return to auth UI.

## API Flow

1. Receive request.
2. Validate JWT for protected routes.
3. Validate role for board operations.
4. Read/write MongoDB models.
5. Return normalized JSON responses or structured errors.

## Data Flow

- User -> Board -> Lists -> Cards (positioned)
- Notification linked to User

---

## 4) Complete Trello Capability Map

## Core Kanban (Implemented)

- Auth (register/login/me)
- Board create/list/view
- List creation
- Card creation
- Drag-and-drop card move
- Role checks in backend
- Notification APIs (fetch/read)

## Advanced Trello Features (Target Complete Flow)

- Workspace management
- Member invite/accept/remove UI
- Role management UI
- Card edit/delete UI controls
- Labels, due dates, checklists, attachments
- Comments and mentions
- Activity log UI
- Search/filter/sort
- Archive and restore flows
- Board templates
- Real-time updates via WebSocket
- Email/push notifications
- Automation rules (if-this-then-that)
- Reporting (throughput, cycle time, workload)

---

## 5) Primary API Journey (Narrative)

1. `POST /api/auth/register` or `POST /api/auth/login`
2. `GET /api/auth/me` (if needed for profile hydration)
3. `GET /api/boards`
4. `POST /api/boards`
5. `POST /api/boards/:boardId/lists`
6. `POST /api/boards/:boardId/lists/:listId/cards`
7. `PATCH /api/boards/:boardId/cards/move`
8. `GET /api/notifications`
9. `POST /api/notifications/:id/read`

---

## 6) Exception Flows

## Authentication Failures

- Invalid credentials -> `401 Invalid credentials`
- Missing token -> `401 Authentication required`
- Expired/invalid token -> client logout + re-auth prompt

## Authorization Failures

- Insufficient role -> `403 Forbidden`

## Missing Entity

- Unknown board/list/card/notification -> `404`

## Validation Failures

- Missing required fields -> `400`

---

## 7) Demo Script (Complete Flow)

1. Register a new user.
2. Create a board.
3. Add three lists: Todo, Doing, Done.
4. Add several cards to Todo.
5. Drag one card Todo -> Doing.
6. Refresh page and verify persisted order.
7. Open notifications endpoint and mark one read.
8. Simulate expired token and verify auto-logout behavior.

---

## 8) Definition of Done for “Complete Trello Flow”

- Users can onboard and collaborate securely.
- Boards, lists, and cards support full lifecycle operations.
- Permissions are enforced consistently.
- Notification and activity visibility is available.
- Session and error handling are robust.
- Advanced planning/collaboration features are available or explicitly tracked in roadmap.
