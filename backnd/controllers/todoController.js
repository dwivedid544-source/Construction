const prisma = require('../config/prisma');

// @desc    Get todos for the current user
// @route   GET /api/todos
// @access  Private
const getTodos = async (req, res, next) => {
    try {
        const { id: userId, companyId } = req.user;
        const whereClause = { companyId, assignedTo: userId };

        if (req.query.status) {
            // Prisma enum mapping compatibility
            whereClause.status = req.query.status;
        }

        const todos = await prisma.todo.findMany({
            where: whereClause,
            include: {
                creator: { select: { fullName: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Mapping for legacy frontend expectations
        const mappedTodos = todos.map(todo => ({
            ...todo,
            _id: todo.id,
            assignedBy: todo.creator
        }));

        res.json(mappedTodos);
    } catch (error) {
        next(error);
    }
};

// @desc    Get todos assigned BY the current user (for admins/PMs)
// @route   GET /api/todos/assigned-by
// @access  Private
const getAssignedByMeTodos = async (req, res, next) => {
    try {
        const { id: userId, companyId } = req.user;
        const whereClause = { companyId, assignedBy: userId };

        const todos = await prisma.todo.findMany({
            where: whereClause,
            include: {
                assignee: { select: { fullName: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Mapping for legacy frontend expectations
        const mappedTodos = todos.map(todo => ({
            ...todo,
            _id: todo.id,
            assignedTo: todo.assignee
        }));

        res.json(mappedTodos);
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new todo
// @route   POST /api/todos
// @access  Private
const createTodo = async (req, res, next) => {
    try {
        const { title, description, assignedTo, priority } = req.body;
        console.log('DEBUG [createTodo] received:', { title, assignedTo });
        if (!req.user) {
            console.error('DEBUG [createTodo]: req.user is null!');
            return res.status(401).json({ message: 'User object missing in request' });
        }
        const { id: userId, companyId, role } = req.user;
        console.log('DEBUG [createTodo] user info:', { userId, role });

        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        // Default to self if not provided or if worker is creating
        let finalAssignedTo = assignedTo || userId;
        
        // Workers can only assign to themselves
        if (['WORKER', 'SUBCONTRACTOR'].includes(role)) {
            finalAssignedTo = userId;
        }

        const todo = await prisma.todo.create({
            data: {
                companyId,
                title,
                description: description || '',
                assignedTo: finalAssignedTo,
                assignedBy: userId,
                priority: priority || 'Medium',
                status: 'pending'
            }
        });

        res.status(201).json({ ...todo, _id: todo.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a todo status or details
// @route   PATCH /api/todos/:id
// @access  Private
const updateTodo = async (req, res, next) => {
    try {
        const { title, description, status, priority } = req.body;
        const { id: userId } = req.user;

        const todo = await prisma.todo.findUnique({
            where: { id: req.params.id }
        });
        if (!todo) {
            return res.status(404).json({ message: 'Todo not found' });
        }

        // Only assigned user or assigner can update
        if (todo.assignedTo !== userId && todo.assignedBy !== userId) {
            return res.status(403).json({ message: 'Not authorized to update this todo' });
        }

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (status !== undefined) updates.status = status;
        if (priority !== undefined) updates.priority = priority;

        const updatedTodo = await prisma.todo.update({
            where: { id: req.params.id },
            data: updates
        });

        res.json({ ...updatedTodo, _id: updatedTodo.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a todo
// @route   DELETE /api/todos/:id
// @access  Private
const deleteTodo = async (req, res, next) => {
    try {
        const { id: userId } = req.user;

        const todo = await prisma.todo.findUnique({
            where: { id: req.params.id }
        });
        if (!todo) {
            return res.status(404).json({ message: 'Todo not found' });
        }

        // Only assigner can delete (or assigned user if they are self-assigned)
        if (todo.assignedBy !== userId && todo.assignedTo !== userId) {
            return res.status(403).json({ message: 'Not authorized to delete this todo' });
        }

        await prisma.todo.delete({
            where: { id: req.params.id }
        });

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
