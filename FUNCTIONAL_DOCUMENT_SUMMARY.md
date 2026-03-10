# Trello Clone – Functional Summary

## Overview

Trello Clone is a lightweight task-board application where authenticated users can organize work using boards, lists, and cards. It supports secure login, role-based board permissions, and drag-and-drop card movement.

## Primary User Flows

1. **Sign up / Log in**
   - User registers or logs in with email/password.
   - App stores session token and shows user identity in the header.

2. **Access Boards**
   - User sees boards where they are owner/member.
   - User can create new boards.

3. **Plan Work in Lists and Cards**
   - User can add lists to a board.
   - User can add cards to lists with optional descriptions.

4. **Reprioritize with Drag-and-Drop**
   - User drags a card within or across lists.
   - UI updates instantly and persists order to backend.

5. **Session Expiry Handling**
   - If session token expires/invalidates, app logs user out automatically.
   - User is returned to auth screen with a clear message.

## Key Functional Capabilities

- JWT-based authentication
- User profile persistence for header badge
- Role-based access control (`owner`, `editor`, `viewer`)
- Board CRUD (current UI supports create + view)
- List/card creation and card movement
- Notification APIs (backend ready)

## Roles and Permissions

- **Owner**: Full board control, including delete.
- **Editor**: Can add/update/delete/move board content.
- **Viewer**: Read-only board visibility.

## API Coverage (Implemented)

- **Auth**: register, login, current user (`/me`)
- **Boards**: list, create, retrieve, delete, add list, add/update/delete card, move card
- **Notifications**: list notifications, mark read

## Non-Functional Expectations

- Basic input validation and clear API errors
- Unauthorized access returns `401`; forbidden actions return `403`
- Stable client behavior on bad/malformed responses

## Current UI Scope

Included:

- Auth form (login/register)
- Boards sidebar
- List/card display
- Add board, add list, add card
- Drag-and-drop card move

Not yet included:

- Notification center UI
- Member/role management UI
- Card edit/delete controls in UI
- Real-time collaboration updates

## Demo Acceptance Checklist

- [ ] User can register and log in
- [ ] Header shows logged-in user badge
- [ ] User can create a board
- [ ] User can add lists and cards
- [ ] User can drag cards across lists and order persists
- [ ] Expired token auto-logs out and returns to auth
