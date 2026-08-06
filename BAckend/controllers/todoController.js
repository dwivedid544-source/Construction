const prisma = require('../config/prisma');

// @desc    Get todos for the current user
// @route   GET /api/todos
// @access  Private
const getTodos = async (req, res, next) => {
    try {
        const userId = req.user._id || req.user.id;

        const todos = await prisma.todo.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(todos.map(t => ({
            ...t,
            _id: t.id,
            title: t.task,
            status: t.completed ? 'completed' : 'pending'
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Get todos assigned BY the current user (for admins/PMs)
// @route   GET /api/todos/assigned-by
// @access  Private
const getAssignedByMeTodos = async (req, res, next) => {
    try {
        const userId = req.user._id || req.user.id;

        const todos = await prisma.todo.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(todos.map(t => ({
            ...t,
            _id: t.id,
            title: t.task,
            status: t.completed ? 'completed' : 'pending'
        })));
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new todo
// @route   POST /api/todos
// @access  Private
const createTodo = async (req, res, next) => {
    try {
        const { title, task, dueDate } = req.body;
        const userId = req.user._id || req.user.id;

        const todo = await prisma.todo.create({
            data: {
                userId,
                task: title || task || 'Untitled Task',
                completed: false,
                dueDate: dueDate ? new Date(dueDate) : null
            }
        });

        res.status(201).json({
            ...todo,
            _id: todo.id,
            title: todo.task,
            status: 'pending'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a todo status or details
// @route   PATCH /api/todos/:id
// @access  Private
const updateTodo = async (req, res, next) => {
    try {
        const { title, task, status, completed } = req.body;

        const todo = await prisma.todo.findUnique({ where: { id: req.params.id } });
        if (!todo) {
            return res.status(404).json({ message: 'Todo not found' });
        }

        const updateData = {};
        if (title !== undefined || task !== undefined) updateData.task = title || task;
        if (completed !== undefined) updateData.completed = completed;
        if (status !== undefined) updateData.completed = status === 'completed';

        const updated = await prisma.todo.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json({
            ...updated,
            _id: updated.id,
            title: updated.task,
            status: updated.completed ? 'completed' : 'pending'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a todo
// @route   DELETE /api/todos/:id
// @access  Private
const deleteTodo = async (req, res, next) => {
    try {
        const todo = await prisma.todo.findUnique({ where: { id: req.params.id } });
        if (!todo) {
            return res.status(404).json({ message: 'Todo not found' });
        }

        await prisma.todo.delete({ where: { id: req.params.id } });
        res.json({ message: 'Todo removed' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTodos,
    getAssignedByMeTodos,
    createTodo,
    updateTodo,
    deleteTodo
};
