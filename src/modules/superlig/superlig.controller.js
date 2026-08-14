import { z } from 'zod';
import * as superligService from './superlig.service.js';

const addMatchCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Yorum boş olamaz.')
    .max(500, 'Yorum en fazla 500 karakter olabilir.'),
});

export const getStandings = async (req, res, next) => {
  try {
    const data = await superligService.getStandings();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getFixtures = async (req, res, next) => {
  try {
    const week = req.query.week;
    const data = await superligService.getFixtures(week);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getTopScorers = async (req, res, next) => {
  try {
    const data = await superligService.getTopScorers();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getTransfers = async (req, res, next) => {
  try {
    const clubId = req.query.clubId;
    const data = await superligService.getTransfers(clubId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const syncData = async (req, res, next) => {
  try {
    const result = await superligService.runScrapers();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getLiveMatches = async (req, res, next) => {
  try {
    const data = await superligService.getLiveMatches();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getMatchComments = async (req, res, next) => {
  try {
    const matchId = req.params.matchId;
    const data = await superligService.getMatchComments(matchId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const addMatchComment = async (req, res, next) => {
  try {
    const matchId = req.params.matchId;
    const userId = req.user.id;
    const { content } = addMatchCommentSchema.parse(req.body);
    const data = await superligService.addMatchComment(matchId, userId, content);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};


export const getMatchDetails = async (req, res, next) => {
  try {
    const matchId = req.params.matchId;
    const data = await superligService.getMatchDetails(matchId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
