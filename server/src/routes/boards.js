import express from 'express';
import { Board } from '../models/Board.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All board routes require authentication
router.use(requireAuth);

function getMembership(board, userId) {
  if (!board) return null;
  if (board.owner.toString() === userId) {
    return 'owner';
  }
  const membership = board.members.find((m) => m.user.toString() === userId);
  return membership?.role ?? null;
}

function ensureRole(board, userId, allowedRoles) {
  const role = getMembership(board, userId);
  if (!role || !allowedRoles.includes(role)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
}

// Get all boards current user is a member/owner of
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const boards = await Board.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
    }).sort({ createdAt: 1 });
    res.json(boards);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch boards', error: err.message });
  }
});

// Create board, current user becomes owner
router.post('/', async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.user.id;
    const board = await Board.create({
      title,
      owner: userId,
      members: [{ user: userId, role: 'owner' }],
      lists: [],
    });
    res.status(201).json(board);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create board', error: err.message });
  }
});

// Get single board
router.get('/:boardId', async (req, res) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    ensureRole(board, req.user.id, ['owner', 'editor', 'viewer']);
    res.json(board);
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: err.statusCode === 403 ? 'Forbidden' : 'Failed to fetch board', error: err.message });
  }
});

// Delete board (owner only)
router.delete('/:boardId', async (req, res) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    ensureRole(board, req.user.id, ['owner']);
    await board.deleteOne();
    res.json({ message: 'Board deleted' });
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: err.statusCode === 403 ? 'Forbidden' : 'Failed to delete board', error: err.message });
  }
});

// Add list to board (editor+)
router.post('/:boardId/lists', async (req, res) => {
  try {
    const { title } = req.body;
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    ensureRole(board, req.user.id, ['owner', 'editor']);

    const position = board.lists.length;
    board.lists.push({ title, position, cards: [] });
    await board.save();
    res.status(201).json(board);
  } catch (err) {
    res
      .status(err.statusCode || 400)
      .json({ message: err.statusCode === 403 ? 'Forbidden' : 'Failed to add list', error: err.message });
  }
});

// Delete list (editor+)
router.delete('/:boardId/lists/:listId', async (req, res) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    ensureRole(board, req.user.id, ['owner', 'editor']);

    const list = board.lists.id(req.params.listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    list.deleteOne();

    board.lists.forEach((currentList, index) => {
      currentList.position = index;
    });

    await board.save();
    res.json(board);
  } catch (err) {
    res
      .status(err.statusCode || 400)
      .json({ message: err.statusCode === 403 ? 'Forbidden' : 'Failed to delete list', error: err.message });
  }
});

// Add card to list (editor+)
router.post('/:boardId/lists/:listId/cards', async (req, res) => {
  try {
    const { title, description } = req.body;
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    ensureRole(board, req.user.id, ['owner', 'editor']);

    const list = board.lists.id(req.params.listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const position = list.cards.length;
    list.cards.push({ title, description, position });
    await board.save();
    res.status(201).json(board);
  } catch (err) {
    res
      .status(err.statusCode || 400)
      .json({ message: err.statusCode === 403 ? 'Forbidden' : 'Failed to add card', error: err.message });
  }
});

// Simple card update (title/description) (editor+)
router.put('/:boardId/lists/:listId/cards/:cardId', async (req, res) => {
  try {
    const { title, description } = req.body;
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    ensureRole(board, req.user.id, ['owner', 'editor']);

    const list = board.lists.id(req.params.listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const card = list.cards.id(req.params.cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    if (title !== undefined) card.title = title;
    if (description !== undefined) card.description = description;

    await board.save();
    res.json(board);
  } catch (err) {
    res
      .status(err.statusCode || 400)
      .json({ message: err.statusCode === 403 ? 'Forbidden' : 'Failed to update card', error: err.message });
  }
});

// Delete card (editor+)
router.delete('/:boardId/lists/:listId/cards/:cardId', async (req, res) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    ensureRole(board, req.user.id, ['owner', 'editor']);

    const list = board.lists.id(req.params.listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const card = list.cards.id(req.params.cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    card.deleteOne();
    await board.save();
    res.json(board);
  } catch (err) {
    res
      .status(err.statusCode || 400)
      .json({ message: err.statusCode === 403 ? 'Forbidden' : 'Failed to delete card', error: err.message });
  }
});

// Move card for drag-and-drop (editor+)
router.patch('/:boardId/cards/move', async (req, res) => {
  try {
    const { cardId, sourceListId, targetListId, targetPosition } = req.body;
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    ensureRole(board, req.user.id, ['owner', 'editor']);

    const sourceList = board.lists.id(sourceListId);
    const targetList = board.lists.id(targetListId);
    if (!sourceList || !targetList) {
      return res.status(404).json({ message: 'Source or target list not found' });
    }

    const card = sourceList.cards.id(cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    // Remove from source
    sourceList.cards.id(cardId).deleteOne();

    // Insert into target at given index
    const cardsArray = targetList.cards;
    const insertIndex = Math.max(0, Math.min(targetPosition, cardsArray.length));
    cardsArray.splice(insertIndex, 0, card);

    // Re-number positions in both lists
    sourceList.cards.forEach((c, idx) => {
      c.position = idx;
    });
    targetList.cards.forEach((c, idx) => {
      c.position = idx;
    });

    await board.save();
    res.json(board);
  } catch (err) {
    res
      .status(err.statusCode || 400)
      .json({ message: err.statusCode === 403 ? 'Forbidden' : 'Failed to move card', error: err.message });
  }
});

export default router;

