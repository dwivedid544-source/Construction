const express = require('express');
const router = express.Router();
const {
    getTasks,
    getMyTasks,
    getProjectTasks,
    createTask,
    assignTask,
    updateTask,
    deleteTask,
    reorderTasks,
    getSubTasks,
    createSubTask,
    updateSubTask,
    deleteSubTask,
    getSchedule,
    addDependency
} = require('../controllers/taskController');
const { protect, authorize, checkPermission } = require('../middlewares/authMiddleware');
const { validate } = require('../validators/validate');
const { createTask: createTaskSchema, updateTask: updateTaskSchema, listTasks, createSubTask: createSubTaskSchema } = require('../validators/schemas/task.schema');
const { auditMiddleware } = require('../utils/auditLog');

router.use(protect);
router.use(auditMiddleware('Task'));

router.patch('/reorder', reorderTasks);

// Must be before /:id to avoid route conflict
router.get('/my-tasks', getMyTasks);
router.get('/schedule', getSchedule);
router.get('/project/:projectId', getProjectTasks);

router.get('/', checkPermission('VIEW_TASKS'), validate(listTasks, 'query'), getTasks);
router.post('/', checkPermission('CREATE_TASK'), validate(createTaskSchema), createTask);

router.put('/:id/assign', checkPermission('EDIT_TASK'), assignTask);
router.patch('/:id', validate(updateTaskSchema), updateTask); // Internal role checks or generic update
router.post('/:id/dependency', addDependency);
router.delete('/:id', checkPermission('DELETE_TASK'), deleteTask);

// Sub-tasks
router.get('/:id/subtasks', getSubTasks);
router.post('/:id/subtasks', validate(createSubTaskSchema), createSubTask);
router.patch('/:id/subtasks/:subTaskId', updateSubTask);
router.delete('/:id/subtasks/:subTaskId', deleteSubTask);

module.exports = router;
