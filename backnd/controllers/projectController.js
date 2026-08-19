const prisma = require('../config/prisma');

// @desc    Get projects for the company
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res, next) => {
    try {
        const { role, id: userId, companyId } = req.user;
        const whereClause = { companyId };

        if (role === 'SUPER_ADMIN') {
            delete whereClause.companyId;
        }

        if (['FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(role)) {
            const [assignedJobs, directProjects] = await Promise.all([
                prisma.job.findMany({
                    where: {
                        companyId,
                        OR: [
                            { foremanId: userId },
                            { assignedWorkers: { some: { id: userId } } }
                        ]
                    },
                    select: { projectId: true }
                }),
                prisma.project.findMany({
                    where: {
                        companyId,
                        OR: [
                            { pms: { some: { id: userId } } },
                            { pmId: userId },
                            { createdBy: userId }
                        ]
                    },
                    select: { id: true }
                })
            ]);
            
            const allProjectIds = [
                ...new Set([
                    ...assignedJobs.filter(j => j.projectId).map(j => j.projectId),
                    ...directProjects.map(p => p.id)
                ])
            ];
            whereClause.id = { in: allProjectIds };
        }

        if (role === 'CLIENT') {
            whereClause.clientId = userId;
        }

        // Exclude archived projects by default
        if (!req.query.includeArchived) {
            whereClause.NOT = { status: 'archived' };
        }

        const projects = await prisma.project.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                status: true,
                pmId: true,
                clientId: true,
                createdAt: true,
                budget: true,
                currentPhase: true,
                locationAddress: true,
                locationLatitude: true,
                locationLongitude: true,
                siteLatitude: true,
                siteLongitude: true,
                progress: true,
                image: true,
                startDate: true,
                endDate: true,
                sortOrder: true,
                client: {
                    select: { fullName: true, email: true }
                },
                projectManager: {
                    select: { fullName: true, email: true }
                },
                pms: {
                    select: { id: true, fullName: true, email: true }
                }
            },
            orderBy: [
                { sortOrder: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        // Add compatibility mappings for frontend
        const mappedProjects = projects.map(p => ({
            ...p,
            _id: p.id,
            pmIds: p.pms,
            pmId: p.projectManager,
            clientId: p.client,
            location: {
                address: p.locationAddress,
                latitude: p.locationLatitude,
                longitude: p.locationLongitude
            }
        }));

        res.json(mappedProjects);
    } catch (error) {
        next(error);
    }
};

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res, next) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id },
            include: {
                client: { select: { fullName: true, email: true, avatar: true } },
                creator: { select: { fullName: true, avatar: true } },
                pms: { select: { id: true, fullName: true, email: true, avatar: true } },
                projectManager: { select: { fullName: true, email: true, avatar: true } }
            }
        });

        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        // Multi-tenant authorization check
        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId !== project.companyId) {
            res.status(403);
            throw new Error('Not authorized to access this project');
        }

        // Mapping for legacy frontend expectations
        const mappedProject = {
            ...project,
            _id: project.id,
            clientId: project.client,
            createdBy: project.creator,
            pmIds: project.pms,
            pmId: project.projectManager,
            location: {
                address: project.locationAddress,
                latitude: project.locationLatitude,
                longitude: project.locationLongitude
            }
        };

        res.json(mappedProject);
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private (PM, COMPANY_OWNER, SUPER_ADMIN)
const createProject = async (req, res, next) => {
    try {
        let { name, clientId, startDate, endDate, budget, location, geofenceRadius, image, pmIds, pmId } = req.body;

        if (typeof pmIds === 'string') {
            try {
                pmIds = JSON.parse(pmIds);
            } catch (e) {
                pmIds = pmIds.split(',').filter(id => id.trim());
            }
        }

        // --- ENFORCE PLAN LIMITS ---
        const companyId = req.user.companyId;
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });
        if (company) {
            const plan = company.subscriptionPlanId ? await prisma.plan.findUnique({
                where: { id: company.subscriptionPlanId }
            }) : null;
            
            const maxProjects = plan ? plan.maxProjects : 5; 

            const currentProjectCount = await prisma.project.count({
                where: { companyId }
            });
            if (currentProjectCount >= maxProjects) {
                res.status(403);
                throw new Error(`Project limit reached for your Current Plan (${currentProjectCount}/${maxProjects} projects). Please upgrade your subscription to start more projects or manage existing ones.`);
            }
        }
        // ---------------------------

        let finalImage = image;
        if (req.file) {
            finalImage = req.file.path;
        }

        let finalLocation = {};
        if (typeof location === 'string' && location) {
            try {
                finalLocation = JSON.parse(location);
            } catch (e) {
                finalLocation = { address: location };
            }
        } else if (typeof location === 'object') {
            finalLocation = location;
        }

        const projectPmIds = Array.isArray(pmIds) ? pmIds : (pmId ? [pmId] : []);

        const project = await prisma.project.create({
            data: {
                companyId: req.user.companyId,
                name,
                clientId,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                budget: budget ? Number(budget) : 0,
                locationAddress: finalLocation.address || '',
                locationLatitude: finalLocation.latitude ? Number(finalLocation.latitude) : null,
                locationLongitude: finalLocation.longitude ? Number(finalLocation.longitude) : null,
                geofenceRadius: geofenceRadius ? Number(geofenceRadius) : 200,
                image: finalImage,
                pmId: projectPmIds[0] || pmId || null,
                pms: {
                    connect: projectPmIds.map(id => ({ id }))
                },
                createdBy: req.user.id
            }
        });

        // CREATE CHAT ROOM FOR PROJECT
        try {
            const { syncProjectParticipants } = require('./chatController');

            await prisma.chatRoom.create({
                data: {
                    name: project.name,
                    isGroup: true
                }
            });

            await syncProjectParticipants(project.id);
        } catch (chatError) {
            console.error('Failed to create/sync chat room for project:', chatError);
        }

        const populatedProject = await prisma.project.findUnique({
            where: { id: project.id },
            include: {
                client: { select: { fullName: true, email: true } },
                creator: { select: { fullName: true } },
                pms: { select: { id: true, fullName: true, email: true } },
                projectManager: { select: { fullName: true, email: true } }
            }
        });

        const mappedResult = {
            ...populatedProject,
            _id: populatedProject.id,
            clientId: populatedProject.client,
            createdBy: populatedProject.creator,
            pmIds: populatedProject.pms,
            pmId: populatedProject.projectManager,
            location: {
                address: populatedProject.locationAddress,
                latitude: populatedProject.locationLatitude,
                longitude: populatedProject.locationLongitude
            }
        };

        res.status(201).json(mappedResult);
    } catch (error) {
        next(error);
    }
};

// @desc    Update project
// @route   PATCH /api/projects/:id
// @access  Private (PM, COMPANY_OWNER, SUPER_ADMIN)
const updateProject = async (req, res, next) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id }
        });

        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        // Multi-tenant authorization check
        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId !== project.companyId) {
            res.status(403);
            throw new Error('Not authorized to update this project');
        }

        const updateData = { ...req.body };
        
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === 'null' || updateData[key] === '') {
                updateData[key] = null;
            }
        });

        if (typeof updateData.pmIds === 'string') {
            try {
                updateData.pmIds = JSON.parse(updateData.pmIds);
            } catch (e) {
                updateData.pmIds = updateData.pmIds.split(',').filter(id => id.trim());
            }
        }

        // Sync legacy pmId with pmIds[0]
        if (updateData.pmIds && Array.isArray(updateData.pmIds)) {
            updateData.pmId = updateData.pmIds[0] || null;
        }

        // Handle location
        if (typeof updateData.location === 'string' && updateData.location) {
            try {
                const parsed = JSON.parse(updateData.location);
                updateData.locationAddress = parsed.address;
                updateData.locationLatitude = parsed.latitude ? Number(parsed.latitude) : null;
                updateData.locationLongitude = parsed.longitude ? Number(parsed.longitude) : null;
            } catch (e) {
                updateData.locationAddress = updateData.location;
            }
            delete updateData.location;
        }

        if (req.file) {
            updateData.image = req.file.path;
        }

        const pmIdsToConnect = updateData.pmIds;
        delete updateData.pmIds;
        delete updateData._id;
        delete updateData.id;

        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
        if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
        if (updateData.budget) updateData.budget = Number(updateData.budget);
        if (updateData.progress) updateData.progress = Number(updateData.progress);

        // Disconnect existing pms, connect new ones
        const relationalUpdate = {};
        if (pmIdsToConnect && Array.isArray(pmIdsToConnect)) {
            relationalUpdate.pms = {
                set: pmIdsToConnect.map(id => ({ id }))
            };
        }

        const updatedProject = await prisma.project.update({
            where: { id: req.params.id },
            data: {
                ...updateData,
                ...relationalUpdate
            },
            include: {
                pms: { select: { id: true, fullName: true, email: true } },
                projectManager: { select: { fullName: true, email: true } },
                creator: { select: { fullName: true } }
            }
        });

        // Sync chat participants if PM or Client changed
        if (pmIdsToConnect || updateData.pmId || updateData.clientId) {
            try {
                const { syncProjectParticipants } = require('./chatController');
                await syncProjectParticipants(updatedProject.id);
            } catch (syncErr) {
                console.error('Chat sync failed after project update:', syncErr.message);
            }
        }

        const mappedResult = {
            ...updatedProject,
            _id: updatedProject.id,
            pmIds: updatedProject.pms,
            pmId: updatedProject.projectManager,
            createdBy: updatedProject.creator,
            location: {
                address: updatedProject.locationAddress,
                latitude: updatedProject.locationLatitude,
                longitude: updatedProject.locationLongitude
            }
        };

        res.json(mappedResult);
    } catch (error) {
        console.error('Update Project Error:', error);
        next(error);
    }
};

// @desc    Archive project (Soft delete)
// @route   DELETE /api/projects/:id
// @access  Private (COMPANY_OWNER, PM, SUPER_ADMIN)
const deleteProject = async (req, res, next) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id }
        });

        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        // Multi-tenant authorization check
        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId !== project.companyId) {
            res.status(403);
            throw new Error('Not authorized to archive this project');
        }

        await prisma.project.update({
            where: { id: req.params.id },
            data: { status: 'archived' }
        });
        
        res.json({ message: 'Project moved to archive' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get archived projects
// @route   GET /api/projects/archived
// @access  Private (COMPANY_OWNER, SUPER_ADMIN)
const getArchivedProjects = async (req, res, next) => {
    try {
        const projects = await prisma.project.findMany({
            where: {
                companyId: req.user.companyId,
                status: 'archived'
            },
            include: {
                client: { select: { fullName: true } },
                pms: { select: { fullName: true } },
                projectManager: { select: { fullName: true } }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        const mappedProjects = projects.map(p => ({
            ...p,
            _id: p.id,
            clientId: p.client,
            pmIds: p.pms,
            pmId: p.projectManager
        }));

        res.json(mappedProjects);
    } catch (error) {
        next(error);
    }
};

// @desc    Restore archived project
// @route   PATCH /api/projects/:id/restore
// @access  Private (COMPANY_OWNER, SUPER_ADMIN)
const restoreProject = async (req, res, next) => {
    try {
        const project = await prisma.project.findFirst({
            where: { id: req.params.id, companyId: req.user.companyId }
        });

        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        const restored = await prisma.project.update({
            where: { id: req.params.id },
            data: { status: 'active' }
        });

        res.json({ message: 'Project restored successfully', project: restored });
    } catch (error) {
        next(error);
    }
};

// @desc    Permanently delete project
// @route   DELETE /api/projects/:id/permanent
// @access  Private (COMPANY_OWNER, SUPER_ADMIN)
const permanentlyDeleteProject = async (req, res, next) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id }
        });

        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        // Multi-tenant authorization check
        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId !== project.companyId) {
            res.status(403);
            throw new Error('Not authorized to delete this project');
        }

        // Delete dependencies via Prisma transaction
        const jobs = await prisma.job.findMany({
            where: { projectId: project.id },
            select: { id: true }
        });
        const jobIds = jobs.map(j => j.id);

        await prisma.$transaction([
            prisma.timeLog.deleteMany({ where: { projectId: project.id } }),
            prisma.jobTask.deleteMany({ where: { jobId: { in: jobIds } } }),
            prisma.job.deleteMany({ where: { projectId: project.id } }),
            // Drawing, Estimate, Invoice cascade deletions can also be added here or rely on DB CASCADE
            prisma.project.delete({ where: { id: req.params.id } })
        ]);

        res.json({ message: 'Project permanently removed' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get project members (Team members working on the project)
// @route   GET /api/projects/:id/members
// @access  Private
const getProjectMembers = async (req, res, next) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id },
            include: { pms: true }
        });

        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        // Multi-tenant authorization check
        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId !== project.companyId) {
            res.status(403);
            throw new Error('Not authorized to access this project');
        }

        const tasks = await prisma.task.findMany({
            where: { projectId: req.params.id },
            select: { assignedTo: true }
        });
        const assignedUserIds = new Set();
        
        tasks.forEach(t => {
            if (t.assignedTo) {
                assignedUserIds.add(t.assignedTo);
            }
        });

        const jobs = await prisma.job.findMany({
            where: { projectId: req.params.id },
            include: { assignedWorkers: true }
        });
        jobs.forEach(j => {
            if (j.foremanId) assignedUserIds.add(j.foremanId);
            if (j.assignedWorkers) {
                j.assignedWorkers.forEach(w => assignedUserIds.add(w.id));
            }
        });

        if (project.createdBy) assignedUserIds.add(project.createdBy);
        if (project.pms) {
            project.pms.forEach(pm => assignedUserIds.add(pm.id));
        }
        if (project.pmId) assignedUserIds.add(project.pmId);

        const members = await prisma.user.findMany({
            where: {
                id: { in: Array.from(assignedUserIds) },
                NOT: { role: 'CLIENT' }
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                phone: true,
                isActive: true
            }
        });

        const mappedMembers = members.map(m => ({ ...m, _id: m.id, status: m.isActive ? 'active' : 'inactive' }));

        res.json(mappedMembers);
    } catch (error) {
        next(error);
    }
};

// @desc    Get client-safe progress summary
// @route   GET /api/projects/:id/client-progress
// @access  Private (Client, Admin, PM)
const getClientProgress = async (req, res, next) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id }
        });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (req.user.role === 'CLIENT' && project.clientId !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const jobs = await prisma.job.findMany({
            where: { projectId: project.id },
            select: { id: true }
        });
        const jobIds = jobs.map(j => j.id);

        const tasks = await prisma.jobTask.findMany({
            where: { jobId: { in: jobIds } }
        });

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const completedWork = tasks
            .filter(t => t.status === 'completed')
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 10)
            .map(t => t.title);

        const upcomingWork = tasks
            .filter((t) => t.status === 'pending' || t.status === 'in_progress')
            .sort((a, b) => (a.dueDate || Infinity) - (b.dueDate || Infinity))
            .slice(0, 5)
            .map(t => t.title);

        res.json({
            projectName: project.name,
            currentPhase: project.currentPhase || 'Planning',
            progress: progressPercentage,
            status: project.status,
            completedWork,
            upcomingWork,
            startDate: project.startDate,
            endDate: project.endDate,
            budget: project.budget
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get client-visible updates
// @route   GET /api/projects/:id/client-updates
// @access  Private
const getProjectClientUpdates = async (req, res, next) => {
    try {
        const whereClause = { projectId: req.params.id };

        if (req.user.role === 'CLIENT') {
            whereClause.isVisibleToClient = true;
        }

        const updates = await prisma.projectUpdate.findMany({
            where: whereClause,
            include: {
                user: { select: { fullName: true } }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const mappedUpdates = updates.map(u => ({
            ...u,
            _id: u.id,
            createdBy: u.user
        }));

        res.json(mappedUpdates);
    } catch (error) {
        next(error);
    }
};

// @desc    Create a project update
// @route   POST /api/projects/:id/client-updates
// @access  Private (PM+)
const createProjectClientUpdate = async (req, res, next) => {
    try {
        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => file.path);
        }

        const isVisibleToClient = req.body.isVisibleToClient === 'true' || req.body.isVisibleToClient === true;

        // In schema.prisma, ProjectUpdate model was defined as:
        // update String @db.Text
        // Let's adapt req.body.description to that field
        const update = await prisma.projectUpdate.create({
            data: {
                update: req.body.description || req.body.title || '',
                projectId: req.params.id,
                userId: req.user.id
            }
        });

        if (isVisibleToClient) {
            const project = await prisma.project.findUnique({
                where: { id: req.params.id }
            });
            if (project && project.clientId) {
                await prisma.notification.create({
                    data: {
                        companyId: req.user.companyId,
                        userId: project.clientId,
                        title: 'New Project Update',
                        message: `A new update has been posted for project: "${project.name}".`,
                        type: 'system'
                    }
                });

                const io = req.app.get('io');
                if (io) {
                    io.to(project.clientId).emit('new_notification', {
                        title: 'New Project Update',
                        message: `A new update has been posted for project: "${project.name}".`
                    });
                }
            }
        }

        res.status(201).json({ ...update, _id: update.id });
    } catch (error) {
        next(error);
    }
};

// @desc    Get project financial summary (PO totals)
// @route   GET /api/projects/:id/financial-summary
// @access  Private
const getProjectFinancialSummary = async (req, res, next) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id }
        });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const pos = await prisma.purchaseOrder.findMany({
            where: {
                projectId: project.id,
                NOT: { status: 'Cancelled' }
            }
        });

        const totalPoCost = pos.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0);
        const committedCost = pos
            .filter(po => ['Approved', 'Sent', 'Delivered', 'Closed'].includes(po.status))
            .reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0);

        const pendingCost = totalPoCost - committedCost;
        const budget = Number(project.budget) || 0;
        const remainingBudget = budget - totalPoCost;
        const utilizationPercentage = budget > 0 ? (totalPoCost / budget) * 100 : 0;

        res.json({
            totalBudget: budget,
            totalPoCost,
            committedCost,
            pendingCost,
            remainingBudget,
            utilizationPercentage: utilizationPercentage.toFixed(2),
            poCount: pos.length
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reorder projects
// @route   POST /api/projects/reorder
// @access  Private (COMPANY_OWNER, SUPER_ADMIN)
const reorderProjects = async (req, res, next) => {
    try {
        const { projectIds } = req.body;
        if (!projectIds || !Array.isArray(projectIds)) {
            res.status(400);
            throw new Error('Project IDs array is required');
        }

        await prisma.$transaction(
            projectIds.map((id, index) => {
                const whereClause = { id };
                if (req.user.role !== 'SUPER_ADMIN') {
                    whereClause.companyId = req.user.companyId;
                }
                return prisma.project.update({
                    where: whereClause,
                    data: { sortOrder: index }
                });
            })
        );

        res.json({ message: 'Projects reordered successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get project notes
// @route   GET /api/projects/:id/notes
// @access  Private
const getProjectNotes = async (req, res, next) => {
    try {
        const notes = await prisma.projectNote.findMany({
            where: {
                projectId: req.params.id,
                companyId: req.user.companyId
            },
            include: {
                user: { select: { fullName: true, avatar: true } }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        const mappedNotes = notes.map(n => ({
            ...n,
            _id: n.id,
            createdBy: n.user
        }));

        res.json(mappedNotes);
    } catch (err) {
        next(err);
    }
};

// @desc    Create a project note
// @route   POST /api/projects/:id/notes
// @access  Private
const createProjectNote = async (req, res, next) => {
    try {
        const { content } = req.body;
        if (!content) {
            res.status(400);
            throw new Error('Content is required');
        }

        const note = await prisma.projectNote.create({
            data: {
                projectId: req.params.id,
                companyId: req.user.companyId,
                note: content,
                userId: req.user.id
            }
        });

        const populated = await prisma.projectNote.findUnique({
            where: { id: note.id },
            include: { user: { select: { fullName: true, avatar: true } } }
        });

        res.status(201).json({
            ...populated,
            _id: populated.id,
            createdBy: populated.user
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete a project note
// @route   DELETE /api/projects/:id/notes/:noteId
// @access  Private
const deleteProjectNote = async (req, res, next) => {
    try {
        await prisma.projectNote.deleteMany({
            where: {
                id: req.params.noteId,
                companyId: req.user.companyId
            }
        });
        
        res.json({ message: 'Note deleted' });
    } catch (err) {
        next(err);
    }
};

// @desc    Update a project note
// @route   PATCH /api/projects/:id/notes/:noteId
// @access  Private
const updateProjectNote = async (req, res, next) => {
    try {
        const { content } = req.body;
        if (!content) {
            res.status(400);
            throw new Error('Content is required');
        }

        // We use updateMany to safely enforce multi-tenant constraints on update
        await prisma.projectNote.updateMany({
            where: {
                id: req.params.noteId,
                companyId: req.user.companyId
            },
            data: { note: content }
        });

        const note = await prisma.projectNote.findUnique({
            where: { id: req.params.noteId },
            include: { user: { select: { fullName: true, avatar: true } } }
        });

        if (!note) {
            res.status(404);
            throw new Error('Note not found');
        }

        res.json({
            ...note,
            _id: note.id,
            createdBy: note.user
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    getProjectMembers,
    getClientProgress,
    getProjectClientUpdates,
    createProjectClientUpdate,
    getProjectFinancialSummary,
    getArchivedProjects,
    restoreProject,
    permanentlyDeleteProject,
    reorderProjects,
    getProjectNotes,
    createProjectNote,
    deleteProjectNote,
    updateProjectNote
};
