/**
 * User-to-User Notification Handlers for ArenaX
 * Handles personal push notifications for gifts, DMs, and friend requests
 * 
 * These functions are exposed globally via window object and can be called from index.html
 */

import { doc, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { sendPersonalNotification } from './fcmNotifications';
import { auth } from './firebase';

/**
 * Send a gift from one user to another with push notification
 */
export async function sendUserGift(
  recipientUid: string,
  giftType: string,
  giftName: string
): Promise<boolean> {
  if (!recipientUid || !auth.currentUser) {
    console.error('[Gift] Missing recipient or current user');
    return false;
  }

  try {
    const senderUid = auth.currentUser.uid;
    const senderName = auth.currentUser.displayName || 'Anonymous';
    const senderAv = auth.currentUser.photoURL || '';

    // 1. Save gift record to Firestore subcollection
    const giftsColRef = collection(db, 'users', recipientUid, 'gifts');
    const giftDocRef = await addDoc(giftsColRef, {
      senderId: senderUid,
      senderName: senderName,
      senderAv: senderAv,
      giftType: giftType,
      giftName: giftName,
      read: false,
      createdAt: serverTimestamp()
    });

    console.log('[Gift] Saved to Firestore:', giftDocRef.id);

    // 2. Send push notification to recipient
    const notificationSent = await sendPersonalNotification(recipientUid, {
      title: `${giftName} Gift Received! 🎁`,
      body: `${senderName} sent you a ${giftName}!`,
      icon: senderAv || 'https://arenax.cyou/icon-512.png',
      url: `https://arenax.cyou/#/gifts`,
      data: { 
        type: 'user_gift', 
        giftType: giftType, 
        senderId: senderUid,
        senderName: senderName
      }
    });

    console.log('[Gift] Push notification result:', notificationSent);
    return true;
  } catch (err) {
    console.error('[Gift] Error:', err);
    return false;
  }
}

/**
 * Send a direct message from one user to another with push notification
 */
export async function sendUserDM(
  recipientUid: string,
  messageText: string
): Promise<boolean> {
  if (!recipientUid || !auth.currentUser || !messageText.trim()) {
    console.error('[DM] Missing recipient, user, or message text');
    return false;
  }

  try {
    const senderUid = auth.currentUser.uid;
    const senderName = auth.currentUser.displayName || 'Anonymous';
    const senderAv = auth.currentUser.photoURL || '';

    // 1. Build conversation ID (sorted user IDs)
    const conversationId = [senderUid, recipientUid].sort().join('_');
    const messagesColRef = collection(db, 'conversations', conversationId, 'messages');

    // 2. Save message to Firestore
    const messageDocRef = await addDoc(messagesColRef, {
      sender: senderUid,
      senderName: senderName,
      senderAv: senderAv,
      text: messageText,
      read: false,
      createdAt: serverTimestamp()
    });

    console.log('[DM] Message saved:', messageDocRef.id);

    // 3. Send push notification to recipient
    const notificationSent = await sendPersonalNotification(recipientUid, {
      title: `📧 Message from ${senderName}`,
      body: messageText.substring(0, 100) + (messageText.length > 100 ? '...' : ''),
      icon: senderAv || 'https://arenax.cyou/icon-512.png',
      url: `https://arenax.cyou/#/messages?user=${senderUid}`,
      data: { 
        type: 'direct_message', 
        senderId: senderUid,
        conversationId: conversationId
      }
    });

    console.log('[DM] Push notification result:', notificationSent);
    return true;
  } catch (err) {
    console.error('[DM] Error:', err);
    return false;
  }
}

/**
 * Send a friend request from one user to another with push notification
 */
export async function sendFriendRequest(
  recipientUid: string
): Promise<boolean> {
  if (!recipientUid || !auth.currentUser) {
    console.error('[Friend Request] Missing recipient or current user');
    return false;
  }

  try {
    const senderUid = auth.currentUser.uid;
    const senderName = auth.currentUser.displayName || 'Anonymous';
    const senderAv = auth.currentUser.photoURL || '';

    // 1. Save friend request to Firestore
    const requestsColRef = collection(db, 'users', recipientUid, 'friendRequests');
    const requestDocRef = await addDoc(requestsColRef, {
      senderId: senderUid,
      senderName: senderName,
      senderAv: senderAv,
      status: 'pending',
      read: false,
      createdAt: serverTimestamp()
    });

    console.log('[Friend Request] Saved:', requestDocRef.id);

    // 2. Send push notification to recipient
    const notificationSent = await sendPersonalNotification(recipientUid, {
      title: `👋 Friend Request from ${senderName}`,
      body: `${senderName} wants to be your friend!`,
      icon: senderAv || 'https://arenax.cyou/icon-512.png',
      url: `https://arenax.cyou/#/friends?requests=true`,
      data: { 
        type: 'friend_request', 
        senderId: senderUid,
        senderName: senderName
      }
    });

    console.log('[Friend Request] Push notification result:', notificationSent);
    return true;
  } catch (err) {
    console.error('[Friend Request] Error:', err);
    return false;
  }
}

// Export globally for index.html compatibility
if (typeof window !== 'undefined') {
  (window as any).sendUserGift = sendUserGift;
  (window as any).sendUserDM = sendUserDM;
  (window as any).sendFriendRequest = sendFriendRequest;
}
