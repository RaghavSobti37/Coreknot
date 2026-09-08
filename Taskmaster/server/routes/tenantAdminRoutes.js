const express = require('express');
const { protect, requirePlatformAdmin } = require('../middleware/authMiddleware');
const { listTenants, updateTenant, exportTenant, deleteTenant } = require('../controllers/tenantAdminController');
const { auditSensitiveMutation } = require('../services/securityAuditService');

const router = express.Router();

// Platform-wide tenant directory — never expose to org-scoped admins.
router.use(protect, requirePlatformAdmin);

router.get('/', listTenants);
router.post('/:id/export', auditSensitiveMutation({ resourceType: 'Tenant', action: 'EXPORT' }), exportTenant);
router.post('/:id/delete', auditSensitiveMutation({ resourceType: 'Tenant', action: 'DELETE' }), deleteTenant);
router.patch('/:id', auditSensitiveMutation({ resourceType: 'Tenant', action: 'UPDATE' }), updateTenant);

module.exports = router;
