import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
let db;

try {
    // Parse the Firebase private key from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_PRIVATE_KEY);
    
    const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
    });

    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.log('Make sure FIREBASE_PRIVATE_KEY and FIREBASE_PROJECT_ID are set correctly');
}

// Save a new conversation to Firebase
export async function saveConversation(conversationData) {
    try {
        if (!db) {
            throw new Error('Firebase not initialized');
        }

        const docRef = await db.collection('chat_conversations').add({
            ...conversationData,
            createdAt: new Date(),
            status: 'active'
        });

        console.log('💾 Conversation saved with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving conversation:', error);
        throw error;
    }
}

// Update an existing conversation
export async function updateConversation(conversationId, updateData) {
    try {
        if (!db) {
            throw new Error('Firebase not initialized');
        }

        await db.collection('chat_conversations').doc(conversationId).update({
            ...updateData,
            updatedAt: new Date()
        });

        console.log('📝 Conversation updated:', conversationId);
        return true;
    } catch (error) {
        console.error('Error updating conversation:', error);
        throw error;
    }
}

// Mark conversation as completed and trigger notification
export async function completeConversation(conversationId, finalData) {
    try {
        if (!db) {
            throw new Error('Firebase not initialized');
        }

        const completionData = {
            ...finalData,
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date()
        };

        await db.collection('chat_conversations').doc(conversationId).update(completionData);
        
        // Save to completed conversations collection for easier querying
        await db.collection('completed_conversations').add({
            originalId: conversationId,
            ...completionData
        });

        console.log('✅ Conversation completed:', conversationId);
        
        // Trigger notification (you can customize this)
        await sendCompletionNotification(conversationId, finalData);
        
        return true;
    } catch (error) {
        console.error('Error completing conversation:', error);
        throw error;
    }
}

// Send notification when conversation is completed
async function sendCompletionNotification(conversationId, conversationData) {
    try {
        // Save notification to Firebase for your dashboard
        await db.collection('notifications').add({
            type: 'conversation_completed',
            conversationId: conversationId,
            title: 'New LegacyBot Conversation Completed',
            message: `New lead from ${conversationData.userInfo?.name || 'Anonymous'} - ${conversationData.messages?.length || 0} messages`,
            data: conversationData,
            read: false,
            createdAt: new Date()
        });

        console.log('🔔 Notification sent for conversation:', conversationId);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

// Get conversation by thread ID
export async function getConversationByThreadId(threadId) {
    try {
        if (!db) {
            throw new Error('Firebase not initialized');
        }

        const snapshot = await db.collection('chat_conversations')
            .where('threadId', '==', threadId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data()
        };
    } catch (error) {
        console.error('Error getting conversation:', error);
        return null;
    }
}

// Analyze conversation for completion triggers
export function shouldCompleteConversation(messages) {
    const lastFewMessages = messages.slice(-6).map(m => m.content.toLowerCase());
    const conversationText = lastFewMessages.join(' ');
    
    // Completion triggers - customize these based on your needs
    const completionTriggers = [
        'thank you',
        'thanks',
        'goodbye',
        'bye',
        'talk soon',
        'contact me',
        'call me',
        'email me',
        'follow up',
        'schedule',
        'meeting',
        'appointment',
        'quote',
        'proposal'
    ];
    
    // Lead qualification indicators
    const qualificationIndicators = [
        'phone',
        'email',
        'contact',
        'budget',
        'timeline',
        'website',
        'design',
        'project'
    ];
    
    const hasCompletionTrigger = completionTriggers.some(trigger => 
        conversationText.includes(trigger)
    );
    
    const hasQualificationInfo = qualificationIndicators.some(indicator => 
        conversationText.includes(indicator)
    );
    
    // Mark as complete if conversation has both triggers and qualification info
    // OR if it's been more than 10 messages
    return (hasCompletionTrigger && hasQualificationInfo) || messages.length >= 10;
}

// Extract user information from conversation
export function extractUserInfo(messages) {
    const userInfo = {
        name: null,
        email: null,
        phone: null,
        company: null,
        project: null,
        budget: null,
        timeline: null
    };
    
    const conversationText = messages.map(m => m.content).join(' ');
    
    // Simple extraction patterns - you can make these more sophisticated
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    
    const emails = conversationText.match(emailRegex);
    const phones = conversationText.match(phoneRegex);
    
    if (emails && emails.length > 0) {
        userInfo.email = emails[0];
    }
    
    if (phones && phones.length > 0) {
        userInfo.phone = phones[0];
    }
    
    // Look for name patterns (after "I'm" or "My name is")
    const namePatterns = [
        /(?:i'm|my name is|i am)\s+([a-zA-Z\s]+)/i,
        /(?:this is|call me)\s+([a-zA-Z\s]+)/i
    ];
    
    for (const pattern of namePatterns) {
        const match = conversationText.match(pattern);
        if (match && match[1]) {
            userInfo.name = match[1].trim();
            break;
        }
    }
    
    return userInfo;
}

export { db };