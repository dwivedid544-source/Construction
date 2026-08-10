const express = require('express');
const router = express.Router();
const { loginUser, registerUser, registerCompany, getMe, getUsers, updateUser, deleteUser, createUser, updatePassword, updateProfile } = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { checkUserLimit } = require('../middlewares/checkPlanLimits');
const upload = require('../middlewares/uploadMiddleware');
const { validate } = require('../validators/validate');
const { login, registerCompany: registerCompanySchema, updateProfile: updateProfileSchema, changePassword } = require('../validators/schemas/auth.schema');
const { inviteUser, updateUser: updateUserSchema } = require('../validators/schemas/user.schema');
const { auditMiddleware } = require('../utils/auditLog');

router.post('/login', validate(login), loginUser);
router.post('/register', registerUser);
router.post('/register-company', validate(registerCompanySchema), registerCompany);

router.use(protect);
router.use(auditMiddleware('User'));

router.get('/me', getMe);
router.get('/users', getUsers);
router.post('/users', authorize('SUPER_ADMIN', 'COMPANY_OWNER'), checkUserLimit, validate(inviteUser), createUser);
router.patch('/users/:id', authorize('SUPER_ADMIN', 'COMPANY_OWNER'), validate(updateUserSchema), updateUser);
router.patch('/profile', upload.single('avatar'), validate(updateProfileSchema), updateProfile);
router.patch('/updatepassword', validate(changePassword), updatePassword);
router.delete('/users/:id', authorize('SUPER_ADMIN', 'COMPANY_OWNER'), deleteUser);

module.exports = router;
