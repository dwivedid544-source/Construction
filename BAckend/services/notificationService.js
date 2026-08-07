/**
 * notificationService.js — Notification Business Logic.
 */

'use strict';

const { notificationRepository } = require('../repositories');

class NotificationService {
  async getUserNotifications(userId, query = {}) {
    return notificationRepository.findByUser(userId, query);
  }

  async getUnreadCount(userId) {
    return notificationRepository.countUnread(userId);
  }

  async markAllAsRead(userId) {
    return notificationRepository.markAllRead(userId);
  }

  async deleteNotification(id) {
    return notificationRepository.softDeleteById(id);
  }
}

module.exports = new NotificationService();
