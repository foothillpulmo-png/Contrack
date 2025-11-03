import { Hono } from 'hono';
import { broadcastActivityUpdate } from './websocket';
export const activityRoutes = new Hono();
// Mock activity data
const mockActivities = [
    {
        id: '1',
        type: 'ticket_created',
        description: 'New ticket created for John Doe - Sleep Study Equipment Issue',
        userId: 'user1',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        metadata: { ticketId: 1, patientId: 1 }
    },
    {
        id: '2',
        type: 'ticket_updated',
        description: 'Ticket status updated to "in-progress" for Mary Smith',
        userId: 'user2',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        metadata: { ticketId: 2, status: 'in-progress' }
    },
    {
        id: '3',
        type: 'call_logged',
        description: 'Call documented with Robert Johnson regarding insurance authorization',
        userId: 'user3',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        metadata: { ticketId: 3, callType: 'outbound' }
    }
];
// Get all activities
activityRoutes.get('/', async (c) => {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const type = c.req.query('type');
    let filteredActivities = mockActivities;
    if (type) {
        filteredActivities = filteredActivities.filter(activity => activity.type === type);
    }
    // Sort by timestamp (newest first)
    filteredActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    // Apply pagination
    const paginatedActivities = filteredActivities.slice(offset, offset + limit);
    return c.json({
        activities: paginatedActivities,
        total: filteredActivities.length,
        limit,
        offset
    });
});
// Get single activity
activityRoutes.get('/:id', async (c) => {
    const activityId = c.req.param('id');
    const activity = mockActivities.find(a => a.id === activityId);
    if (!activity) {
        return c.json({ error: 'Activity not found' }, 404);
    }
    return c.json(activity);
});
// Create new activity
activityRoutes.post('/', async (c) => {
    const activityData = await c.req.json();
    try {
        const newActivity = {
            id: Date.now().toString(),
            ...activityData,
            timestamp: new Date()
        };
        // Add to mock data
        mockActivities.push(newActivity);
        // Broadcast activity creation to all WebSocket clients
        broadcastActivityUpdate(newActivity);
        return c.json({
            success: true,
            activity: newActivity,
            message: 'Activity created successfully and broadcasted in real-time'
        });
    }
    catch (error) {
        return c.json({
            error: 'Failed to create activity',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
// Get activities by type
activityRoutes.get('/type/:type', async (c) => {
    const type = c.req.param('type');
    const limit = parseInt(c.req.query('limit') || '50');
    const filteredActivities = mockActivities
        .filter(activity => activity.type === type)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    return c.json(filteredActivities);
});
// Get activities by user
activityRoutes.get('/user/:userId', async (c) => {
    const userId = c.req.param('userId');
    const limit = parseInt(c.req.query('limit') || '50');
    const filteredActivities = mockActivities
        .filter(activity => activity.userId === userId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    return c.json(filteredActivities);
});
// Get activity statistics
activityRoutes.get('/stats', async (c) => {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivities = mockActivities.filter(activity => activity.timestamp >= last24Hours);
    const typeCounts = recentActivities.reduce((acc, activity) => {
        acc[activity.type] = (acc[activity.type] || 0) + 1;
        return acc;
    }, {});
    const stats = {
        total: mockActivities.length,
        last24Hours: recentActivities.length,
        typeCounts,
        mostActiveType: Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b, '')
    };
    return c.json(stats);
});
//# sourceMappingURL=activities.js.map
