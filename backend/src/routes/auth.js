import { Router } from 'express';
import { signup, signin } from '../services/authService.js';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const user = await signup(email, password);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/signin
router.post('/signin', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const result = await signin(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
