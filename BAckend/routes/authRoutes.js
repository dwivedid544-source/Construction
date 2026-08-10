const express = require('express');
const router = express.Router();
const { 
  loginUser, 
  registerUser, 
  registerCompany, 
  registerSubscription,
  getMe, 
  getUsers, 
  updateUser, 
  deleteUser, 
  createUser, 
  updatePassword, 
  updateProfile,
  forgotPasswordUser,
  resetPasswordUser,
  sendOtpUser
} = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { checkUserLimit } = require('../middlewares/checkPlanLimits');
const upload = require('../middlewares/uploadMiddleware');
const { validate } = require('../validators/validate');
const { 
  login, 
  registerCompany: registerCompanySchema, 
  updateProfile: updateProfileSchema, 
  changePassword,
  forgotPassword,
  resetPassword
} = require('../validators/schemas/auth.schema');
const { inviteUser, updateUser: updateUserSchema } = require('../validators/schemas/user.schema');
const { auditMiddleware } = require('../utils/auditLog');
const { authRateLimiter } = require('../middlewares/rateLimiter');

router.post('/login', authRateLimiter, validate(login), loginUser);
router.post('/register', authRateLimiter, registerUser);
router.post('/register-company', authRateLimiter, validate(registerCompanySchema), registerCompany);
router.post('/register-subscription', registerSubscription);
router.post('/forgot-password', authRateLimiter, validate(forgotPassword), forgotPasswordUser);
router.post('/reset-password', authRateLimiter, validate(resetPassword), resetPasswordUser);
router.post('/send-otp', authRateLimiter, sendOtpUser);

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
