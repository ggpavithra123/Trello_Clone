import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import "./style.css";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function getAuthToken() {
  return localStorage.getItem("token");
}

function getStoredAuthUser() {
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function jsonHeaders() {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type Card = {
  _id: string;
  title: string;
  description?: string;
};

type List = {
  _id: string;
  title: string;
  cards: Card[];
};

type Board = {
  _id: string;
  title: string;
  lists: List[];
};

type AuthMode = "login" | "register";

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

const STARTER_BOARD_TITLE = "Trello Clone - Starter Board";

const STARTER_LISTS: Array<{ title: string; cards: Array<{ title: string; description: string }> }> = [
  {
    title: "Backlog",
    cards: [
      { title: "Members - invite and role UI", description: "Add member invite flow and role update controls." },
      { title: "Cards - edit and delete actions", description: "Allow card updates and removal in the frontend." },
      { title: "Notifications panel", description: "Display notification feed and unread state in UI." },
      { title: "Search and filter", description: "Search boards/lists/cards and filter quickly." },
      { title: "Activity timeline", description: "Track board and card-level activity history." },
    ],
  },
  {
    title: "Todo",
    cards: [
      { title: "Form validation messages", description: "Show clear field-level validation feedback." },
      { title: "Loading states for actions", description: "Add loading indicators for list/card operations." },
      { title: "Empty state cards", description: "Show helper empty states for brand-new boards." },
      { title: "Mobile layout polish", description: "Improve spacing and behavior on small screens." },
      { title: "API error normalization", description: "Use a shared helper to format API errors." },
    ],
  },
  {
    title: "In Progress",
    cards: [
      {
        title: "Toast on drag-drop save fail",
        description: "Show a toast when backend persistence fails after optimistic move.",
      },
      {
        title: "Replace window.confirm",
        description: "Create reusable confirm dialog component for destructive actions.",
      },
    ],
  },
  {
    title: "Review/Testing",
    cards: [
      { title: "Test 401 auto logout", description: "Verify expired token always redirects to auth screen." },
      { title: "Test list delete flow", description: "Ensure cards are removed and list positions reindex correctly." },
      { title: "Test drag-drop persistence", description: "Validate card moves persist across refresh." },
      { title: "Test auth me hydration", description: "Token-only startup should hydrate user badge from /auth/me." },
      { title: "Test invalid token startup", description: "Verify safe handling when token is missing/invalid at startup." },
    ],
  },
  {
    title: "Done",
    cards: [
      { title: "JWT auth register/login", description: "Implemented token-based authentication flow." },
      { title: "Current user endpoint and badge", description: "Added /api/auth/me and persisted user display." },
      { title: "Board list and card creation", description: "Users can create boards, lists, and cards." },
      { title: "Drag and drop card movement", description: "Card movement within/across lists is supported." },
      { title: "Delete list action", description: "List deletion endpoint and UI button are implemented." },
    ],
  },
];

type ToastState = {
  type: "success" | "error";
  message: string;
};

export function App() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() =>
    getAuthToken(),
  );
  const [authUser, setAuthUser] = useState<AuthUser | null>(() =>
    getStoredAuthUser(),
  );
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newListTitle, setNewListTitle] = useState("");
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDescription, setNewCardDescription] = useState("");
  const [activeListForNewCard, setActiveListForNewCard] = useState<
    string | null
  >(null);

  const selectedBoard =
    boards.find((b) => b._id === selectedBoardId) ?? boards[0];

  useEffect(() => {
    if (!authToken) {
      setLoading(false);
      return;
    }
    void fetchBoards();
  }, [authToken]);

  useEffect(() => {
    if (!authToken || authUser) {
      return;
    }
    void fetchCurrentUser();
  }, [authToken, authUser]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 2500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
  }

  function clearSession(message?: string) {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    setAuthToken(null);
    setAuthUser(null);
    setBoards([]);
    setSelectedBoardId(null);
    setActiveListForNewCard(null);
    setError(message ?? null);
  }

  async function fetchProtected(input: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    const token = getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const res = await fetch(input, {
      ...init,
      headers,
    });
    if (res.status === 401) {
      clearSession("Session expired. Please log in again.");
      throw new Error("UNAUTHORIZED");
    }
    return res;
  }

  async function fetchBoards() {
    try {
      setLoading(true);
      if (!authToken) {
        setBoards([]);
        setError("Unauthorized. Please log in to load boards.");
        return;
      }
      const res = await fetchProtected(`${API_BASE}/api/boards`);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setBoards([]);
        setError(data?.message || "Failed to load boards");
        return;
      }

      if (!Array.isArray(data)) {
        setBoards([]);
        setError("Unexpected boards response from server");
        return;
      }

      setError(null);
      setBoards(data);
      if (data.length && !selectedBoardId) {
        setSelectedBoardId(data[0]._id);
      }
    } catch (e) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        return;
      }
      setError("Failed to load boards");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCurrentUser() {
    try {
      const res = await fetchProtected(`${API_BASE}/api/auth/me`);
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.user) {
        return;
      }
      localStorage.setItem("auth_user", JSON.stringify(payload.user));
      setAuthUser(payload.user);
    } catch (e) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        return;
      }
    }
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) return;
    if (authMode === "register" && !authName.trim()) return;

    try {
      setAuthLoading(true);
      const res = await fetch(`${API_BASE}/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          authMode === "register"
            ? {
                name: authName.trim(),
                email: authEmail.trim(),
                password: authPassword,
              }
            : {
                email: authEmail.trim(),
                password: authPassword,
              },
        ),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.token) {
        setError(payload?.message || "Authentication failed");
        showToast("error", payload?.message || "Authentication failed");
        return;
      }

      localStorage.setItem("token", payload.token);
      if (payload.user) {
        localStorage.setItem("auth_user", JSON.stringify(payload.user));
        setAuthUser(payload.user);
      }
      setAuthToken(payload.token);
      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
      setError(null);
      showToast("success", authMode === "login" ? "Logged in" : "Account created");
    } catch {
      setError("Authentication failed");
      showToast("error", "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    clearSession();
  }

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    try {
      const res = await fetchProtected(`${API_BASE}/api/boards`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ title: newBoardTitle.trim() }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setError(payload?.message || "Failed to create board");
        showToast("error", payload?.message || "Failed to create board");
        return;
      }
      const board = await res.json();
      setBoards((prev) => [...prev, board]);
      setNewBoardTitle("");
      setSelectedBoardId(board._id);
      showToast("success", "Board created");
    } catch (e) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        return;
      }
      setError("Failed to create board");
      showToast("error", "Failed to create board");
    }
  }

  async function deleteBoard(boardId: string) {
    const confirmed = window.confirm("Delete this board and all its lists/cards?");
    if (!confirmed) return;

    try {
      const res = await fetchProtected(`${API_BASE}/api/boards/${boardId}`, {
        method: "DELETE",
        headers: jsonHeaders(),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setError(payload?.message || "Failed to delete board");
        showToast("error", payload?.message || "Failed to delete board");
        return;
      }

      setBoards((prev) => {
        const updatedBoards = prev.filter((board) => board._id !== boardId);
        if (selectedBoardId === boardId) {
          setSelectedBoardId(updatedBoards[0]?._id ?? null);
        }
        return updatedBoards;
      });
      showToast("success", "Board deleted");
    } catch (e) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        return;
      }
      setError("Failed to delete board");
      showToast("error", "Failed to delete board");
    }
  }

  async function seedTestDataBoard() {
    if (seedLoading) return;
    try {
      setSeedLoading(true);
      const createBoardRes = await fetchProtected(`${API_BASE}/api/boards`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ title: STARTER_BOARD_TITLE }),
      });

      if (!createBoardRes.ok) {
        const payload = await createBoardRes.json().catch(() => null);
        setError(payload?.message || "Failed to create starter board");
        showToast("error", payload?.message || "Failed to create starter board");
        return;
      }

      let board = await createBoardRes.json();

      for (const list of STARTER_LISTS) {
        const addListRes = await fetchProtected(
          `${API_BASE}/api/boards/${board._id}/lists`,
          {
            method: "POST",
            headers: jsonHeaders(),
            body: JSON.stringify({ title: list.title }),
          },
        );

        if (!addListRes.ok) {
          const payload = await addListRes.json().catch(() => null);
          setError(payload?.message || "Failed to add starter lists");
          showToast("error", payload?.message || "Failed to add starter lists");
          return;
        }

        board = await addListRes.json();
        const createdList = [...board.lists]
          .reverse()
          .find((existingList: List) => existingList.title === list.title);

        if (!createdList) {
          setError("Failed to resolve newly created list");
          showToast("error", "Failed to resolve newly created list");
          return;
        }

        for (const card of list.cards) {
          const addCardRes = await fetchProtected(
            `${API_BASE}/api/boards/${board._id}/lists/${createdList._id}/cards`,
            {
              method: "POST",
              headers: jsonHeaders(),
              body: JSON.stringify({ title: card.title, description: card.description }),
            },
          );

          if (!addCardRes.ok) {
            const payload = await addCardRes.json().catch(() => null);
            setError(payload?.message || "Failed to add starter cards");
            showToast("error", payload?.message || "Failed to add starter cards");
            return;
          }

          board = await addCardRes.json();
        }
      }

      setBoards((prev) => {
        const existingIndex = prev.findIndex((item) => item._id === board._id);
        if (existingIndex === -1) {
          return [...prev, board];
        }
        return prev.map((item) => (item._id === board._id ? board : item));
      });
      setSelectedBoardId(board._id);
      showToast("success", "Starter test board loaded");
    } catch (e) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        return;
      }
      setError("Failed to load starter test data");
      showToast("error", "Failed to load starter test data");
    } finally {
      setSeedLoading(false);
    }
  }

  async function addList(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBoard || !newListTitle.trim()) return;
    try {
      const res = await fetchProtected(
        `${API_BASE}/api/boards/${selectedBoard._id}/lists`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({ title: newListTitle.trim() }),
        },
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setError(payload?.message || "Failed to add list");
        showToast("error", payload?.message || "Failed to add list");
        return;
      }
      const updated = await res.json();
      setBoards((prev) =>
        prev.map((b) => (b._id === updated._id ? updated : b)),
      );
      setNewListTitle("");
      showToast("success", "List added");
    } catch (e) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        return;
      }
      setError("Failed to add list");
      showToast("error", "Failed to add list");
    }
  }

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBoard || !activeListForNewCard || !newCardTitle.trim()) return;
    try {
      const res = await fetchProtected(
        `${API_BASE}/api/boards/${selectedBoard._id}/lists/${activeListForNewCard}/cards`,
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            title: newCardTitle.trim(),
            description: newCardDescription.trim(),
          }),
        },
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setError(payload?.message || "Failed to add card");
        showToast("error", payload?.message || "Failed to add card");
        return;
      }
      const updated = await res.json();
      setBoards((prev) =>
        prev.map((b) => (b._id === updated._id ? updated : b)),
      );
      setNewCardTitle("");
      setNewCardDescription("");
      setActiveListForNewCard(null);
      showToast("success", "Card added");
    } catch (e) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        return;
      }
      setError("Failed to add card");
      showToast("error", "Failed to add card");
    }
  }

  async function deleteList(listId: string) {
    if (!selectedBoard) return;
    const confirmed = window.confirm("Delete this list and all cards in it?");
    if (!confirmed) return;
    try {
      const res = await fetchProtected(
        `${API_BASE}/api/boards/${selectedBoard._id}/lists/${listId}`,
        {
          method: "DELETE",
          headers: jsonHeaders(),
        },
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setError(payload?.message || "Failed to delete list");
        showToast("error", payload?.message || "Failed to delete list");
        return;
      }
      const updated = await res.json();
      setBoards((prev) =>
        prev.map((b) => (b._id === updated._id ? updated : b)),
      );
      if (activeListForNewCard === listId) {
        setActiveListForNewCard(null);
      }
      showToast("success", "List deleted");
    } catch (e) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        return;
      }
      setError("Failed to delete list");
      showToast("error", "Failed to delete list");
    }
  }

  function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;
    if (!selectedBoard) return;
    if (type !== "CARD") return;

    const sourceListId = source.droppableId;
    const targetListId = destination.droppableId;

    if (sourceListId === targetListId && source.index === destination.index) {
      return;
    }

    // optimistic UI update
    setBoards((prev) =>
      prev.map((board) => {
        if (board._id !== selectedBoard._id) return board;
        const listsCopy = board.lists.map((l) => ({
          ...l,
          cards: [...l.cards],
        }));
        const sourceList = listsCopy.find((l) => l._id === sourceListId);
        const targetList = listsCopy.find((l) => l._id === targetListId);
        if (!sourceList || !targetList) return board;

        const [moved] = sourceList.cards.splice(source.index, 1);
        if (!moved) return board;
        targetList.cards.splice(destination.index, 0, moved);

        return { ...board, lists: listsCopy };
      }),
    );

    // persist to backend
    void (async () => {
      try {
        const res = await fetchProtected(
          `${API_BASE}/api/boards/${selectedBoard._id}/cards/move`,
          {
            method: "PATCH",
            headers: jsonHeaders(),
            body: JSON.stringify({
              cardId: draggableId,
              sourceListId,
              targetListId,
              targetPosition: destination.index,
            }),
          },
        );

        if (!res.ok) {
          void fetchBoards();
          return;
        }

        const updated = await res.json();
        setBoards((prev) =>
          prev.map((b) => (b._id === updated._id ? updated : b)),
        );
      } catch (e) {
        if (e instanceof Error && e.message === "UNAUTHORIZED") {
          return;
        }
        void fetchBoards();
      }
    })();
  }

  if (loading && authToken) {
    return <div className="app-root">Loading boards...</div>;
  }

  if (!authToken) {
    return (
      <div className="app-root auth-root">
        {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
        <div className="auth-bg-orb auth-bg-orb-one" />
        <div className="auth-bg-orb auth-bg-orb-two" />
        <div className="auth-shell">
          <div className="auth-hero">
            <h1>Trello Clone</h1>
            <p>Organize tasks, track progress, and collaborate with clarity.</p>
            <div className="auth-hero-points">
              <span>Boards</span>
              <span>Lists</span>
              <span>Cards</span>
              <span>Drag & Drop</span>
            </div>
          </div>
          <div className="auth-card">
            <h2>{authMode === "login" ? "Welcome back" : "Create account"}</h2>
            <p>
              {authMode === "login"
                ? "Login to continue"
                : "Create an account to continue"}
            </p>
            <form onSubmit={handleAuthSubmit} className="auth-form">
              {authMode === "register" && (
                <input
                  type="text"
                  placeholder="Name"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              <button type="submit" disabled={authLoading}>
                {authLoading
                  ? "Please wait..."
                  : authMode === "login"
                    ? "Login"
                    : "Register"}
              </button>
            </form>
            <button
              type="button"
              className="auth-toggle"
              onClick={() => {
                setAuthMode((prev) => (prev === "login" ? "register" : "login"));
                setError(null);
              }}
            >
              {authMode === "login"
                ? "Need an account? Register"
                : "Have an account? Login"}
            </button>
            {error && <div className="auth-error">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
      <header className="app-header">
        <h1>Trello Clone</h1>
      </header>
      {error && <div className="error-banner">{error}</div>}
      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-session">
            {authUser && (
              <div className="user-badge" title={authUser.email}>
                {authUser.name || authUser.email}
              </div>
            )}
            <button className="logout-btn" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
          <h2>Boards</h2>
          <ul className="board-list">
            {boards.map((board) => (
              <li
                key={board._id}
                className={
                  board._id === selectedBoard?._id
                    ? "board-item active"
                    : "board-item"
                }
                onClick={() => setSelectedBoardId(board._id)}
              >
                <span className="board-item-title">{board.title}</span>
                <button
                  type="button"
                  className="delete-board-btn"
                  aria-label={`Delete board ${board.title}`}
                  title="Delete board"
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteBoard(board._id);
                  }}
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={createBoard} className="sidebar-form">
            <input
              type="text"
              placeholder="New board title"
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
            />
            <button type="submit">Add Board</button>
          </form>
          <button
            type="button"
            className="seed-data-btn"
            onClick={() => void seedTestDataBoard()}
            disabled={seedLoading}
          >
            {seedLoading ? "Loading test data..." : "Load Test Data"}
          </button>
        </aside>
        <main className="board-area">
          {selectedBoard ? (
            <>
              <div className="board-header">
                <h2>{selectedBoard.title}</h2>
              </div>
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="lists-row">
                  {selectedBoard.lists.map((list) => (
                    <Droppable
                      droppableId={list._id}
                      key={list._id}
                      type="CARD"
                    >
                      {(provided) => (
                        <div
                          className="list-column"
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                        >
                          <div className="list-header">
                            <h3>{list.title}</h3>
                            <button
                              type="button"
                              className="delete-list-btn"
                              onClick={() => void deleteList(list._id)}
                            >
                              Delete
                            </button>
                          </div>
                          <div className="cards">
                            {list.cards.map((card, index) => (
                              <Draggable
                                draggableId={card._id}
                                index={index}
                                key={card._id}
                              >
                                {(dragProvided) => (
                                  <div
                                    className="card"
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                  >
                                    <div className="card-title">
                                      {card.title}
                                    </div>
                                    {card.description && (
                                      <div className="card-description">
                                        {card.description}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                          <button
                            className="add-card-inline"
                            type="button"
                            onClick={() => setActiveListForNewCard(list._id)}
                          >
                            + Add a card
                          </button>
                        </div>
                      )}
                    </Droppable>
                  ))}
                  <div className="list-column new-list">
                    <form onSubmit={addList}>
                      <input
                        type="text"
                        placeholder="New list title"
                        value={newListTitle}
                        onChange={(e) => setNewListTitle(e.target.value)}
                      />
                      <button type="submit">Add List</button>
                    </form>
                  </div>
                </div>
              </DragDropContext>
            </>
          ) : (
            <p>No boards yet. Create one from the sidebar.</p>
          )}
        </main>
      </div>

      {activeListForNewCard && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveListForNewCard(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>New Card</h3>
            <form onSubmit={addCard}>
              <input
                type="text"
                placeholder="Card title"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
              />
              <textarea
                placeholder="Description (optional)"
                value={newCardDescription}
                onChange={(e) => setNewCardDescription(e.target.value)}
              />
              <div className="modal-actions">
                <button type="submit">Create</button>
                <button
                  type="button"
                  onClick={() => setActiveListForNewCard(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
