import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty
} from '../controllers/propertiesController.js';

export const propertiesRouter = Router();

// Retrieve all properties for the logged-in agent/broker
propertiesRouter.get('/', requireAuth, getProperties);

// Retrieve details for a single property (public, no authentication required)
propertiesRouter.get('/:id', getProperty);

// Edit property listings (authenticated)
propertiesRouter.post('/', requireAuth, createProperty);
propertiesRouter.put('/:id', requireAuth, updateProperty);
propertiesRouter.patch('/:id', requireAuth, updateProperty);
propertiesRouter.delete('/:id', requireAuth, deleteProperty);
