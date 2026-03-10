# Trello Clone – Functional Document

## 1. Purpose

This document defines the functional behavior of the Trello Clone application currently implemented in this repository.

## 2. Product Scope

The application provides authenticated collaborative board management with:

- User registration and login
- Board creation and viewing
- List creation inside boards
- Card creation inside lists
- Card drag-and-drop movement across lists
- Basic notification retrieval/read APIs (backend)

## 3. Actors

- **Owner**: Full access to own board (create/update/delete/move)
- **Editor**: Can modify board content (lists/cards/move)
- **Viewer**: Read-only board access

## 4. Authentication & Session

### 4.1 Authentication model

- JWT Bearer token authentication is required for protected endpoints.
- Token is issued on register/login.

### 4.2 Client session behavior

- Client stores token in `localStorage` key `token`.
- Client stores profile in `localStorage` key `auth_user`.
- If token is present but profile is missing, client calls `GET /api/auth/me` to hydrate user badge.
- On any protected API `401`, client clears session and returns to auth screen.

## 5. Functional Requirements

### FR-1: User Registration

- User can register with `name`, `email`, `password`.
- System validates required fields.
- System rejects duplicate email.
- On success, system returns JWT token and user profile.

### FR-2: User Login

- User can login with `email`, `password`.
- System validates credentials.
- On success, system returns JWT token and user profile.

### FR-3: Current User Lookup

- Authenticated user can request current profile via `/api/auth/me`.
- System returns authenticated user id, name, and email.

### FR-4: Board List Retrieval

- Authenticated user can fetch boards where they are owner/member.
- Boards are sorted by creation time ascending.

### FR-5: Board Creation

- Authenticated user can create a board with title.
- Creator is assigned owner role and included in members.

### FR-6: Single Board Retrieval

- Authenticated user with role `owner|editor|viewer` can retrieve board details.

### FR-7: Board Deletion

- Only `owner` can delete a board.

### FR-8: List Creation

- `owner|editor` can add lists to a board.
- New list position defaults to the end.

### FR-9: Card Creation

- `owner|editor` can add cards to a list with title and optional description.
- New card position defaults to the end.

### FR-10: Card Update

- `owner|editor` can update card title/description.

### FR-11: Card Deletion

- `owner|editor` can delete a card.

### FR-12: Card Drag-and-Drop Move

- `owner|editor` can move card from source list to target list with target index.
- System recalculates positions in affected lists.
- Client performs optimistic UI update, then persists to backend.

### FR-13: Notifications (Backend API)

- Authenticated user can fetch latest notifications (up to 50, newest first).
- Authenticated user can mark own notification as read.

## 6. API Endpoints (Implemented)

### 6.1 Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (protected)

### 6.2 Boards (all protected)

- `GET /api/boards`
- `POST /api/boards`
- `GET /api/boards/:boardId`
- `DELETE /api/boards/:boardId`
- `POST /api/boards/:boardId/lists`
- `POST /api/boards/:boardId/lists/:listId/cards`
- `PUT /api/boards/:boardId/lists/:listId/cards/:cardId`
- `DELETE /api/boards/:boardId/lists/:listId/cards/:cardId`
- `PATCH /api/boards/:boardId/cards/move`

### 6.3 Notifications (all protected)

- `GET /api/notifications`
- `POST /api/notifications/:id/read`

## 7. Data Model (Functional View)

### User

- id
- name
- email
- passwordHash (internal)

### Board

- id
- title
- owner (user id)
- members: `[{ user, role }]`
- lists

### List

- id
- title
- position
- cards

### Card

- id
- title
- description
- position

### Notification

- id
- user
- type
- payload
- isRead
- createdAt / updatedAt

## 8. Client UX Behavior (Current)

- App shows auth form if not authenticated.
- User can toggle between login/register.
- After auth, user sees board workspace.
- Header shows logged-in user badge and logout button.
- Sidebar shows boards and board creation form.
- Main area shows lists/cards and supports drag-and-drop.
- Inline errors appear for failed operations.

## 9. Error Handling Rules

- Missing/invalid token returns `401` from backend protected routes.
- Unauthorized role returns `403` for restricted board operations.
- Missing entities return `404` (board/list/card/notification not found).
- Client clears session on `401` and asks user to log in again.

## 10. Environment Configuration

### Server (`server/.env`)

- `MONGO_URI`
- `PORT`
- `JWT_SECRET`

### Client (`client/.env`)

- `VITE_API_URL` (example: `http://localhost:9000`)

## 11. Out of Scope / Not Yet Implemented in UI

- Notification center UI
- Board membership management UI (invite/change role)
- List/card editing and deletion UI controls
- Password reset and email verification
- Real-time multi-user sync (WebSocket)

## 12. Acceptance Checklist

- [ ] User can register and login
- [ ] Authenticated user can create and view boards
- [ ] User can add lists and cards
- [ ] User can drag card between lists and order is saved
- [ ] Expired/invalid token forces logout
- [ ] Existing token without cached profile still shows user badge via `/api/auth/me`
