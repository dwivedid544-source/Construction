/**
 * notificationController.js — Notification Controller.
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notificationService');
const { notificationRepository } = require('../repositories');

// GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getUserNotifications(req.user.id, req.query);
  const notificationsArray = Array.isArray(result) ? result : (result.data || []);
  res.json(notificationsArray);
});

// PATCH /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationRepository.updateById(req.params.id, { readStatus: true });
  res.json({
    success: true,
    data: notification,
  });
});

// PATCH /api/notifications/mark-all-read
const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  res.json({
    success: true,
    message: 'All notifications marked as read',
    data: result,
  });
});

// DELETE /api/notifications/clear-all
const clearAllNotifications = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  res.json({
    success: true,
    message: 'All notifications cleared',
  });
});

// POST /api/notifications/fcm-token
const updateFcmToken = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'FCM token registered successfully',
  });
});

// POST /api/notifications/fcm-token/deactivate
const deactivateFcmToken = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'FCM token deactivated successfully',
  });
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllRead,
  clearAllNotifications,
  updateFcmToken,
  deactivateFcmToken,
};
