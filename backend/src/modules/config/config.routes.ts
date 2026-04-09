import { Router } from 'express';
import * as ConfigController from './config.controller';
import { authenticate, checkPermission } from '../../middleware/auth.middleware';

const router = Router();

// Base Auth
router.use(authenticate);

// PERMISSION GROUPS
const canReadMaster = checkPermission('ADMIN_CONFIG', 'INVENTORY_VIEW', 'PROCUREMENT_VIEW', 'VENDOR_VIEW');
const canModifyMaster = checkPermission('ADMIN_CONFIG');

// Units
router.get('/units', canReadMaster, ConfigController.getUnits);
router.post('/units', canModifyMaster, ConfigController.createUnit);
router.put('/units/:id', canModifyMaster, ConfigController.updateUnit);
router.delete('/units/:id', canModifyMaster, ConfigController.deleteUnit);

// Categories
router.get('/categories', canReadMaster, ConfigController.getCategories);
router.post('/categories', canModifyMaster, ConfigController.createCategory);
router.post('/categories/batch', canModifyMaster, ConfigController.createCategoriesBatch);
router.patch('/categories/move/:id', canModifyMaster, ConfigController.moveCategory);
router.put('/categories/:id', canModifyMaster, ConfigController.updateCategory);
router.delete('/categories/:id', canModifyMaster, ConfigController.deleteCategory);

// Payment Terms
router.get('/payment-terms', canReadMaster, ConfigController.getPaymentTerms);
router.post('/payment-terms', canModifyMaster, ConfigController.createPaymentTerm);

// Rules Engine
router.get('/rules', canReadMaster, ConfigController.getFieldRules);
router.put('/rules', canModifyMaster, ConfigController.updateFieldRules);

export default router;
