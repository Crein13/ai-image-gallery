import { Router } from 'express';
import { signup, signin } from '../services/authService.js';

const router = Router();

router.post('/signup', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const result = await signup(email, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

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
