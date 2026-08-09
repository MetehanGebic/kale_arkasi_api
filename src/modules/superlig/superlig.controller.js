import * as superligService from './superlig.service.js';

export const getStandings = async (req, res, next) => {
  try {
    const data = await superligService.getStandings();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

export const getFixtures = async (req, res, next) => {
  try {
    const week = req.query.week;
    const data = await superligService.getFixtures(week);
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

export const getTopScorers = async (req, res, next) => {
  try {
    const data = await superligService.getTopScorers();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

export const getTransfers = async (req, res, next) => {
  try {
    const clubId = req.query.clubId;
    const data = await superligService.getTransfers(clubId);
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

export const syncData = async (req, res, next) => {
  try {
    const result = await superligService.runScrapers();
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};
