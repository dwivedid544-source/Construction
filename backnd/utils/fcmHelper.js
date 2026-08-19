const admin = require('firebase-admin');
const prisma = require('../config/prisma');

let firebaseApp = null;
let messaging = null;

try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        messaging = admin.messaging();
        console.log('[Firebase Admin] Successfully initialized via FIREBASE_SERVICE_ACCOUNT.');
    } else if (projectId && clientEmail && privateKey) {
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey
            })
        });
        messaging = admin.messaging();
        console.log('[Firebase Admin] Successfully initialized via individual environment variables.');
    } else {
        console.warn('[Firebase Admin] Firebase keys are missing in environment variables. FCM helper will run in DRY-RUN mode.');
    }
} catch (error) {
    console.error('[Firebase Admin] Initialization failed:', error.message);
    console.warn('[Firebase Admin] FCM helper will run in DRY-RUN mode due to initialization failure.');
}

const sendPushNotification = async (userIds, title, body, extraData = {}, io = null) => {
    try {
        const ids = Array.isArray(userIds) ? userIds : [userIds];
        if (ids.length === 0) return;

        const tokensDoc = await prisma.fcmToken.findMany({
            where: {
                userId: { in: ids },
                isActive: true
            }
        });

        if (tokensDoc.length === 0) {
            console.log(`[FCM] No active device tokens found for users: ${ids.join(', ')}`);
            return;
        }

        console.log(`[FCM] Saved device tokens in database for users ${ids.join(', ')}:`, tokensDoc.map(d => ({ token: d.token, platform: d.deviceType })));

        const tokensByUser = {};
        tokensDoc.forEach(doc => {
            if (!tokensByUser[doc.userId]) {
                tokensByUser[doc.userId] = [];
            }
            tokensByUser[doc.userId].push(doc);
        });

        const targetTokens = [];
        const invalidTokens = [];

        for (const userId of Object.keys(tokensByUser)) {
            let isUserOnline = false;
            if (io) {
                const sockets = io.sockets.adapter.rooms.get(userId.toString());
                isUserOnline = sockets && sockets.size > 0;
            }

            if (isUserOnline) {
                console.log(`[FCM] User ${userId} is currently online via Socket.IO. Skipping push notification.`);
                continue;
            }

            tokensByUser[userId].forEach(doc => {
                targetTokens.push(doc.token);
            });
        }

        if (targetTokens.length === 0) {
            console.log('[FCM] All target users are currently online or have no tokens. No push notifications sent.');
            return;
        }

        console.log(`[FCM] Sending push notification to ${targetTokens.length} tokens. Title: "${title}"`);

        if (!messaging) {
            console.log('[FCM DRY-RUN] Push notification payload:', {
                tokensCount: targetTokens.length,
                title,
                body,
                extraData
            });
            return;
        }

        const safeData = {};
        for (const key in extraData) {
            if (extraData[key] !== null && extraData[key] !== undefined) {
                safeData[key] = String(extraData[key]);
            }
        }
        
        if (safeData.roomId && !safeData.chatId) {
            safeData.chatId = safeData.roomId;
        }
        if (!safeData.type) {
            safeData.type = 'chat';
        }

        const messages = targetTokens.map(token => ({
            token: token,
            notification: {
                title: title,
                body: body
            },
            data: safeData,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'high_importance_channel'
                }
            },
            apns: {
                headers: {
                    'apns-priority': '10',
                    'apns-push-type': 'alert'
                },
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                        'content-available': 1
                    }
                }
            }
        }));

        console.log('[FCM] Backend notification payload:', JSON.stringify(messages, null, 2));

        const response = await messaging.sendEach(messages);

        console.log(`[FCM] Firebase Admin send response:`, JSON.stringify(response, null, 2));
        console.log(`[FCM] Sent notifications. Success: ${response.successCount}, Failure: ${response.failureCount}`);

        if (response.failureCount > 0) {
            response.responses.forEach((res, idx) => {
                if (!res.success) {
                    const error = res.error;
                    if (error && (
                        error.code === 'messaging/invalid-registration-token' ||
                        error.code === 'messaging/registration-token-not-registered'
                    )) {
                        invalidTokens.push(targetTokens[idx]);
                    }
                    console.error(`[FCM] Error sending to token ${targetTokens[idx]}:`, error?.message || 'Unknown error');
                }
            });

            if (invalidTokens.length > 0) {
                console.log(`[FCM] Deactivating ${invalidTokens.length} invalid/expired tokens.`);
                await prisma.fcmToken.updateMany({
                    where: { token: { in: invalidTokens } },
                    data: { isActive: false }
                });
            }
        }

    } catch (error) {
        console.error('[FCM Error] Failed to send push notification:', error.message);
    }
};

module.exports = {
    sendPushNotification
};
