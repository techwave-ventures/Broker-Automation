import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  postAcceptCall,
  postRejectCall,
  postConnectCall,
  postTerminateCall,
  postPreAcceptCall,
  getCallPermissions,
  getCallSettings,
  postCallSettings,
  postCallPermissionRequest,
} from '../controllers/callsController.js';

export const callsRouter = Router();

callsRouter.post('/accept', requireAuth, postAcceptCall);
callsRouter.post('/reject', requireAuth, postRejectCall);
callsRouter.post('/connect', requireAuth, postConnectCall);
callsRouter.post('/terminate', requireAuth, postTerminateCall);
callsRouter.post('/pre-accept', requireAuth, postPreAcceptCall);
callsRouter.get('/permissions', requireAuth, getCallPermissions);
callsRouter.get('/settings', requireAuth, getCallSettings);
callsRouter.post('/settings', requireAuth, postCallSettings);
callsRouter.post('/request-permission', requireAuth, postCallPermissionRequest);
