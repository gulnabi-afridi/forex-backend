import httpMocks from 'node-mocks-http';
import { getBots, getBotFile, addPreset, getOfficalPresets, communityPresets, myPresets, toggleFavoritePreset, getBotVersions, favoritePresets } from '../userBotController.js';

// Mock dependencies
jest.mock('../../models/Bots.js', () => ({
  __esModule: true,
  default: {
    find: jest.fn(() => ({ select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), lean: jest.fn() })),
    findById: jest.fn(() => ({ versions: { id: jest.fn() } })),
  },
}));

jest.mock('../../models/Preset.js', () => ({
  __esModule: true,
  default: function Preset(data){ Object.assign(this, data); this.save = jest.fn(); },
}));

jest.mock('../../services/cloudinaryService.js', () => ({
  __esModule: true,
  default: { uploadPresetFile: jest.fn() },
}));

import Bot from '../../models/Bots.js';
import Preset from '../../models/Preset.js';
import cloudinaryService from '../../services/cloudinaryService.js';

// Helper to build res object
const buildRes = () => httpMocks.createResponse({ eventEmitter: require('events').EventEmitter });

// Utility to set Preset static methods behavior per test
const setPresetStatics = (impls = {}) => {
  Preset.find = impls.find || jest.fn();
  Preset.countDocuments = impls.countDocuments || jest.fn();
  Preset.findById = impls.findById || jest.fn();
  Preset.findByIdAndDelete = impls.findByIdAndDelete || jest.fn();
};

describe('userBotController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBots', () => {
    it('returns 404 when no bots found', async () => {
      Bot.find().lean.mockResolvedValueOnce([]);
      const req = httpMocks.createRequest();
      const res = buildRes();
      await getBots(req, res);
      expect(res.statusCode).toBe(404);
      const data = res._getJSONData();
      expect(data.success).toBe(false);
      expect(data.message).toMatch(/No bots found/);
    });

    it('returns bots with presetCount and sanitized versions', async () => {
      const botId = 'b1';
      const version = { _id: 'v1', versionName: '1.0', whatsNewHere: 'new' };
      Bot.find().lean.mockResolvedValueOnce([{ _id: botId, title: 't', description: 'd', image: 'img', versions: [version] }]);
      setPresetStatics({ countDocuments: jest.fn().mockResolvedValue(3) });

      const req = httpMocks.createRequest();
      const res = buildRes();
      await getBots(req, res);

      expect(res.statusCode).toBe(200);
      const body = res._getJSONData();
      expect(body.success).toBe(true);
      expect(body.data[0].presetCount).toBe(3);
      expect(body.data[0].versions[0]).toEqual({ _id: 'v1', versionName: '1.0', whatsNewHere: 'new' });
    });
  });

  describe('getBotFile', () => {
    it('validates required query params', async () => {
      const req = httpMocks.createRequest({ query: {} });
      const res = buildRes();
      await getBotFile(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('returns file url for valid bot and version', async () => {
      const req = httpMocks.createRequest({ query: { botId: 'b1', versionId: 'v1' } });
      const res = buildRes();

      const versionObj = { file: { url: 'http://u', cloudinaryId: 'cid' } };
      Bot.findById.mockResolvedValueOnce({ versions: { id: jest.fn().mockReturnValue(versionObj) } });

      await getBotFile(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data).toEqual({ url: 'http://u', cloudinaryId: 'cid' });
    });
  });

  describe('addPreset', () => {
    it('validates required fields', async () => {
      const req = httpMocks.createRequest({ query: { botId: 'b', versionId: 'v' }, body: { name: 'n', description: '' } });
      const res = buildRes();
      await addPreset(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('rolls back when upload fails', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        query: { botId: 'b1', versionId: 'v1' },
        body: { name: 'n', description: 'd' },
        file: { originalname: 'f.set', buffer: Buffer.from('x') },
        user: { id: 'u1' },
      });
      const res = buildRes();

      Bot.findById.mockResolvedValueOnce({ versions: { id: jest.fn().mockReturnValue(true) } });

      setPresetStatics({ findByIdAndDelete: jest.fn().mockResolvedValue({}) });
      cloudinaryService.uploadPresetFile.mockResolvedValueOnce({ success: false });

      await addPreset(req, res);
      expect(Preset.findByIdAndDelete).toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
    });

    it('succeeds when upload works and saves preset file meta', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        query: { botId: 'b1', versionId: 'v1' },
        body: { name: 'n', description: 'd' },
        file: { originalname: 'f.set', buffer: Buffer.from('x') },
        user: { id: 'u1' },
      });
      const res = buildRes();

      Bot.findById.mockResolvedValueOnce({ versions: { id: jest.fn().mockReturnValue(true) } });
      cloudinaryService.uploadPresetFile.mockResolvedValueOnce({ success: true, data: { url: 'http://u', public_id: 'pid', created_at: new Date().toISOString() } });

      // capture constructed Preset instance
      let created;
      const RealPreset = Preset;
      // override constructor to intercept instance
      const SpyPreset = function(data){ created = new RealPreset(data); return created; };
      SpyPreset.findByIdAndDelete = jest.fn();
      SpyPreset.countDocuments = jest.fn();
      SpyPreset.find = jest.fn();
      SpyPreset.findById = jest.fn();
      // swap global reference
      // eslint-disable-next-line no-global-assign
      Preset = SpyPreset;

      await addPreset(req, res);

      expect(res.statusCode).toBe(201);
      expect(created.presetFile).toBeDefined();
      expect(created.save).toHaveBeenCalled();
    });
  });

  describe('favorites and listings', () => {
    it('getOfficalPresets returns filtered list with counts and flags', async () => {
      setPresetStatics({ find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([{ _id: 'p1', favorites: ['u1','u2'] }]) }) });
      const req = httpMocks.createRequest({ query: { botId: 'b', versionId: 'v', symbol: 'All symbols' }, user: { id: 'u1' } });
      const res = buildRes();
      await getOfficalPresets(req, res);
      expect(res.statusCode).toBe(200);
      const body = res._getJSONData();
      expect(body.data[0].favoriteCount).toBe(2);
      expect(body.data[0].isFavorited).toBe(true);
    });

    it('communityPresets marks isFavorited correctly', async () => {
      setPresetStatics({ find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([{ _id: 'p1', favorites: ['u1'] }]) }) });
      const req = httpMocks.createRequest({ query: { botId: 'b', versionId: 'v' }, user: { id: 'u1' } });
      const res = buildRes();
      await communityPresets(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data[0].isFavorited).toBe(true);
    });

    it('myPresets requires auth and returns 401 without user', async () => {
      const req = httpMocks.createRequest({ query: { botId: 'b', versionId: 'v' } });
      const res = buildRes();
      await myPresets(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('toggleFavoritePreset toggles favorite state', async () => {
      const req = httpMocks.createRequest({ query: { presetId: 'p1' }, user: { id: 'u1' } });
      const res = buildRes();
      const presetDoc = { favorites: ['u1'], save: jest.fn(), _id: 'p1',
        // simple emulation of Mongoose array methods
        get pull(){ return (id) => { const i=this.favorites.indexOf(id); if(i>-1) this.favorites.splice(i,1); }; },
        get push(){ return (id) => { this.favorites.push(id); }; },
      };
      // Simpler: implement pull/push as functions
      presetDoc.favorites = {
        includes: (id)=> presetDoc._fav.includes(id),
        pull: (id)=> { const i=presetDoc._fav.indexOf(id); if(i>-1) presetDoc._fav.splice(i,1); },
        push: (id)=> { presetDoc._fav.push(id); },
      };
      presetDoc._fav = ['u1'];

      setPresetStatics({ findById: jest.fn().mockResolvedValue(presetDoc) });
      await toggleFavoritePreset(req, res);
      expect(res.statusCode).toBe(200);
      expect(presetDoc._fav).toEqual([]);
    });
  });

  describe('getBotVersions and favoritePresets', () => {
    it('getBotVersions maps versions to id and versionName', async () => {
      const req = httpMocks.createRequest({ query: { botId: 'b1' } });
      const res = buildRes();
      Bot.findById.mockResolvedValueOnce({ versions: [{ _id: 'v1', versionName: '1.0', extra: 'x' }], lean: jest.fn().mockReturnThis() });
      await getBotVersions(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().data[0]).toEqual({ id: 'v1', versionName: '1.0' });
    });

    it('favoritePresets filters by user and marks isFavorited true', async () => {
      setPresetStatics({ find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([{ _id: 'p1', favorites: ['u1'] }]) }) });
      const req = httpMocks.createRequest({ query: {}, user: { id: 'u1' } });
      const res = buildRes();
      await favoritePresets(req, res);
      expect(res.statusCode).toBe(200);
      const item = res._getJSONData().data[0];
      expect(item.isFavorited).toBe(true);
      expect(item.favoriteCount).toBe(1);
    });
  });
});
